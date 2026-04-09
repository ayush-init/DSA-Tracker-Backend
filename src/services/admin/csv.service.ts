import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export const generateBatchReportCSV = async (batchId: number | string) => {
    // Validate and convert batch_id
    if (!batchId || isNaN(parseInt(batchId as string))) {
        throw new ApiError(400, "Valid batch_id is required");
    }

    const batchIdNum = parseInt(batchId as string);

    // Get batch details with city
    const batch = await prisma.batch.findUnique({
        where: { id: batchIdNum },
        include: {
            city: {
                select: { 
                    city_name: true 
                }
            }
        }
    });

    if (!batch) {
        throw new ApiError(400, "Batch not found");
    }

    // Get all students in this batch with their progress and leaderboard data
    const students = await prisma.student.findMany({
        where: { batch_id: batchIdNum },
        include: {
            batch: {
                select: { batch_name: true }
            },
            leaderboards: {
                select: {
                    easy_solved: true,
                    medium_solved: true,
                    hard_solved: true,
                    alltime_city_rank: true,
                    alltime_global_rank: true
                }
            }
        },
        orderBy: [
            { enrollment_id: 'asc' }
        ]
    });

    // Calculate totals for column headers
    const totalEasyAssigned = batch.easy_assigned || 0;
    const totalMediumAssigned = batch.medium_assigned || 0;
    const totalHardAssigned = batch.hard_assigned || 0;
    const totalAssigned = totalEasyAssigned + totalMediumAssigned + totalHardAssigned;

    // Prepare CSV data
    const csvData = students.map(student => {
        const easySolved = student.leaderboards?.easy_solved || 0;
        const mediumSolved = student.leaderboards?.medium_solved || 0;
        const hardSolved = student.leaderboards?.hard_solved || 0;
        const totalSolved = easySolved + mediumSolved + hardSolved;

        return {
            enrollmentId: student.enrollment_id || '',
            name: student.name || '',
            email: student.email || '',
            batchName: student.batch?.batch_name || '',
            hardSolved: hardSolved,
            mediumSolved: mediumSolved,
            easySolved: easySolved,
            totalSolved: totalSolved,
            allTimeCityRank: student.leaderboards?.alltime_city_rank?.toString() || 'N/A',
            allTimeGlobalRank: student.leaderboards?.alltime_global_rank?.toString() || 'N/A',
            leetcodeId: student.leetcode_id || '',
            gfgId: student.gfg_id || ''
        };
    });

    // Generate CSV content using csv-writer structure
    const csvHeaders = [
        { id: 'enrollmentId', title: 'Enrollment ID' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'batchName', title: 'Batch Name' },
        { id: 'hardSolved', title: `Hard Solved (out of ${totalHardAssigned})` },
        { id: 'mediumSolved', title: `Medium Solved (out of ${totalMediumAssigned})` },
        { id: 'easySolved', title: `Easy Solved (out of ${totalEasyAssigned})` },
        { id: 'totalSolved', title: `Total Solved (out of ${totalAssigned})` },
        { id: 'allTimeCityRank', title: 'All Time City Rank' },
        { id: 'allTimeGlobalRank', title: 'All Time Global Rank' },
        { id: 'leetcodeId', title: 'LeetCode ID' },
        { id: 'gfgId', title: 'GeeksforGeeks ID' }
    ];

    // Generate CSV string manually using csv-writer structure for better formatting
    const header = csvHeaders.map(h => `"${h.title}"`).join(',');
    const rows = csvData.map(record => {
        return csvHeaders.map(h => {
            const value = record[h.id as keyof typeof record];
            return `"${value}"`;
        }).join(',');
    }).join('\n');

    const csvString = header + '\n' + rows;

    // Generate filename
    const cityName = batch.city?.city_name || 'Unknown';
    const batchName = batch.batch_name;
    const year = batch.year;
    
    // Sanitize filename parts (remove special characters, replace spaces with underscores)
    const sanitizeName = (name: string) => {
        return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    };
    
    const sanitizedCityName = sanitizeName(cityName);
    const sanitizedBatchName = sanitizeName(batchName);
    
    const filename = `${sanitizedCityName}-${sanitizedBatchName}-${year}.csv`;
    
    console.log('Generated filename:', filename);
    console.log('Original values:', { cityName, batchName, year });

    return {
        csvContent: csvString,
        filename
    };
};
