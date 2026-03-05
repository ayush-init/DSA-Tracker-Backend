import { Request, Response } from "express";
import { assignQuestionsToClassService, getAssignedQuestionsOfClassService, removeQuestionFromClassService } from "../../services/questionVisibility.service";


export const assignQuestionsToClass = async (
  req: Request,
  res: Response
) => {
  try {
    const batch = (req as any).batch;
    const topicSlugParam = req.params.topicSlug;
    const classSlug = req.params.classSlug;

    if (typeof topicSlugParam !== "string") {
      return res.status(400).json({
        error: "Invalid topic slug",
      });
    }

    if (typeof classSlug !== "string") {
      return res.status(400).json({
        error: "Invalid class slug",
      });
    }
    const { question_ids } = req.body;

    const result = await assignQuestionsToClassService({
      batchId: batch.id,
      topicSlug: topicSlugParam,
      classSlug,
      questionIds: question_ids,
    });

    return res.json({
      message: "Questions assigned successfully",
      ...result,
    });

  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};

export const getAssignedQuestionsOfClass = async (
  req: Request,
  res: Response
) => {
  try {
    const batch = (req as any).batch;
    const topicSlugParam = req.params.topicSlug;
    const classSlug = req.params.classSlug;

    if (typeof topicSlugParam !== "string") {
      return res.status(400).json({
        error: "Invalid topic slug",
      });
    }

    if (typeof classSlug !== "string") {
      return res.status(400).json({
        error: "Invalid class slug",
      });
    }

    const assigned = await getAssignedQuestionsOfClassService({
      batchId: batch.id,
      topicSlug: topicSlugParam,
      classSlug,
    });

    return res.json({
      message: "Assigned questions retrieved successfully",
      data: assigned,
    });

  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};


export const removeQuestionFromClass = async (
  req: Request,
  res: Response
) => {
  try {
    const batch = (req as any).batch;
    const topicSlugParam = req.params.topicSlug;
    const classSlug = req.params.classSlug;
    const questionIdParam = req.params.questionId;
    
    if (typeof questionIdParam !== "string") {
      return res.status(400).json({
        error: "Invalid question ID",
      });
    }
    
    const questionId = parseInt(questionIdParam);

    if (typeof topicSlugParam !== "string") {
      return res.status(400).json({
        error: "Invalid topic slug",
      });
    }

    if (typeof classSlug !== "string") {
      return res.status(400).json({
        error: "Invalid class slug",
      });
    }

    if (isNaN(questionId)) {
      return res.status(400).json({
        error: "Invalid question ID",
      });
    }

    await removeQuestionFromClassService({
      batchId: batch.id,
      topicSlug: topicSlugParam,
      classSlug,
      questionId,
    });

    return res.json({
      message: "Question removed successfully",
    });

  } catch (error: any) {
    return res.status(400).json({
      error: error.message,
    });
  }
};