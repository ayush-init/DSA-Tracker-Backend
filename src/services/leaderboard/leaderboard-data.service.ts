import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

export const getAvailableYears = async () => {
  const years = await prisma.batch.findMany({
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'desc' }
  });
  return years.map(y => y.year);
};

export const getAvailableCities = async () => {
  const cities = await prisma.city.findMany({
    select: { city_name: true },
    orderBy: { city_name: 'asc' }
  });
  return cities.map(c => c.city_name);
};

// New function to get city-year mapping
export const getCityYearMapping = async () => {
  try {
    const query = `
      SELECT DISTINCT
        c.city_name,
        b.year
      FROM "City" c
      JOIN "Student" s ON s.city_id = c.id
      JOIN "Batch" b ON b.id = s.batch_id
      WHERE s.id IS NOT NULL
        AND b.year IS NOT NULL
      ORDER BY c.city_name, b.year DESC
    `;
    
    console.log("Executing city-year mapping query:", query);
    const results = await prisma.$queryRawUnsafe(query) as Array<{
      city_name: string;
      year: number;
    }>;
    
    console.log("City-year mapping query results:", results);
    
    // Group by city
    const cityMap: { [key: string]: number[] } = {};
    results.forEach((row: any) => {
      if (!cityMap[row.city_name]) {
        cityMap[row.city_name] = [];
      }
      if (!cityMap[row.city_name].includes(row.year)) {
        cityMap[row.city_name].push(row.year);
      }
    });
    
    // Get all available years
    const availableYears = await getAvailableYears();
    
    // Convert to array format with "All Cities" included
    const cityYearArray = [
      { city_name: "All Cities", available_years: availableYears },
      ...Object.entries(cityMap)
        .map(([city, years]: [string, number[]]) => ({
          city_name: city,
          available_years: [...new Set(years)].sort((a: number, b: number) => b - a)
        }))
        .sort((a: any, b: any) => {
          // Put "All Cities" first, then sort alphabetically
          if (a.city_name === "All Cities") return -1;
          if (b.city_name === "All Cities") return 1;
          return a.city_name.localeCompare(b.city_name);
        })
    ];
    
    console.log("Final city-year array:", cityYearArray);
    return cityYearArray;
    
  } catch (error) {
    console.error("Error in getCityYearMapping:", error);
    throw error;
  }
};
