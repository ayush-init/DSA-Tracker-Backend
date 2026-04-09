/**
 * Topic Service - Topic management with media handling
 * Handles CRUD operations for topics including photo uploads and S3 integration
 * Provides slug generation and media cleanup on errors
 */

import prisma from "../../config/prisma";
import { slugify } from "transliteration";
import { S3Service } from "../../services/storage/s3.service";
import { HTTP_STATUS } from '../../utils/errorMapper';
import { ApiError } from "../../utils/ApiError";
import { CreateTopicDTO, UpdateTopicDTO, UpdateTopicInput, DeleteTopicInput } from '../../types/topic.types';

// Alias for compatibility with existing code
type TopicData = CreateTopicDTO;
type TopicUpdateData = UpdateTopicDTO;

/**
 * Create new topic with optional photo upload
 * @param data - Topic name and optional photo file
 * @returns Created topic with generated slug and photo URL
 */
export const createTopicService = async ({ topic_name, photo }: TopicData) => {
  let photoKey: string | null = null;
  let photoUrl: string | null = null;

  // Handle photo upload if provided
  if (photo) {
    try {
      const uploadResult = await S3Service.uploadFile(photo, 'topics');
      photoUrl = uploadResult.url;
      photoKey = uploadResult.key;
    } catch (error) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to upload photo to S3");
    }
  }

  // Generate slug from topic name
  const baseSlug = slugify(topic_name).toLowerCase();

  let finalSlug = baseSlug;
  let counter = 1;

  // Check for existing slug and generate unique one if needed
  while (
    await prisma.topic.findFirst({
      where: { slug: finalSlug },
    })
  ) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  try {
    const topic = await prisma.topic.create({
      data: {
        topic_name,
        slug: finalSlug,
        photo_url: photoUrl,
      },
    });

    return topic;
  } catch (error: unknown) {
    // If database creation fails, clean up uploaded photo
    if (photoKey) {
      try {
        await S3Service.deleteFile(photoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup photo after database error:", cleanupError);
      }
    }

    if (error instanceof Error && 'code' in error && error.code === "P2002") {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Topic already exists");
    }

    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to create topic");
  }
};

export const updateTopicService = async ({ topicSlug, topic_name, photo, removePhoto }: TopicUpdateData & { topicSlug: string }) => {
  // Find existing topic
  const existingTopic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!existingTopic) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Topic not found");
  }

  let newPhotoUrl: string | null = existingTopic.photo_url;
  let oldPhotoKey: string | null = null;

  // Handle photo removal
  if (removePhoto && existingTopic.photo_url) {
    // Extract key from URL
    const urlParts = existingTopic.photo_url.split('/');
    oldPhotoKey = urlParts[urlParts.length - 1];
    if (oldPhotoKey) {
      oldPhotoKey = `topics/${oldPhotoKey}`;
    }
    newPhotoUrl = null;
  }

  // Handle new photo upload
  if (photo) {
    try {
      const uploadResult = await S3Service.uploadFile(photo, 'topics');
      newPhotoUrl = uploadResult.url;

      // If we had an old photo, mark its key for deletion
      if (existingTopic.photo_url) {
        const urlParts = existingTopic.photo_url.split('/');
        oldPhotoKey = `topics/${urlParts[urlParts.length - 1]}`;
      }
    } catch (error) {
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to upload photo to S3");
    }
  }

  // Handle topic name update if provided
  let finalSlug = existingTopic.slug;
  if (topic_name) {
    const duplicate = await prisma.topic.findUnique({
      where: { topic_name },
    });

    if (duplicate && duplicate.id !== existingTopic.id) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Topic already exists");
    }

    const baseSlug = slugify(topic_name).toLowerCase();

    finalSlug = baseSlug;
    let counter = 1;

    while (
      await prisma.topic.findFirst({
        where: {
          slug: finalSlug,
          NOT: { id: existingTopic.id },
        },
      })
    ) {
      finalSlug = `${baseSlug}-${counter++}`;
    }
  }

  try {
    const updatedTopic = await prisma.topic.update({
      where: { id: existingTopic.id },
      data: {
        ...(topic_name && { topic_name }),
        slug: finalSlug,
        photo_url: newPhotoUrl,
      },
    });

    // Clean up old photo from S3 if update was successful
    if (oldPhotoKey) {
      try {
        await S3Service.deleteFile(oldPhotoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup old photo from S3:", cleanupError);
      }
    }

    return updatedTopic;

  } catch (error: unknown) {
    // If database update fails, clean up newly uploaded photo
    if (photo && newPhotoUrl && newPhotoUrl !== existingTopic.photo_url) {
      const urlParts = newPhotoUrl.split('/');
      const newPhotoKey = `topics/${urlParts[urlParts.length - 1]}`;
      try {
        await S3Service.deleteFile(newPhotoKey);
      } catch (cleanupError) {
        console.error("Failed to cleanup new photo after database error:", cleanupError);
      }
    }

    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update topic");
  }
};

export const deleteTopicService = async ({ topicSlug }: DeleteTopicInput) => {
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Topic not found");
  }

  const classCount = await prisma.class.count({
    where: { topic_id: topic.id },
  });

  if (classCount > 0) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Cannot delete topic with existing classes");
  }

  const questionCount = await prisma.question.count({
    where: { topic_id: topic.id },
  });

  if (questionCount > 0) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Cannot delete topic with existing questions");
  }

  // Delete topic from database
  await prisma.topic.delete({
    where: { id: topic.id },
  });

  // Clean up photo from S3 if it exists
  if (topic.photo_url) {
    try {
      const urlParts = topic.photo_url.split('/');
      const photoKey = `topics/${urlParts[urlParts.length - 1]}`;
      await S3Service.deleteFile(photoKey);
    } catch (cleanupError) {
      console.error("Failed to cleanup photo from S3 after topic deletion:", cleanupError);
    }
  }

  return true;
};

export const createTopicsBulkService = async (topics: Array<{ topic_name: string; slug: string }>) => {
  const created = await prisma.topic.createMany({
    data: topics,
    skipDuplicates: true, // ignore duplicates
  });

  return created;
};
