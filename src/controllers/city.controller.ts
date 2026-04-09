import { Request, Response } from "express";
import { createCityService, deleteCityService, getAllCitiesService, updateCityService } from "../services/cities/city.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

// Create City
export const createCity = asyncHandler(async (req: Request, res: Response) => {
           try {
            const { city_name } = req.body;

            const city = await createCityService({ city_name });

            return res.status(201).json({
              message: "City created successfully",
              city,
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(400, error.message,);
          }
        });

// Get All Cities
export const getAllCities = asyncHandler(async (req: Request, res: Response) => {
          try {
            const { search } = req.query;
            
            let cities = await getAllCitiesService();
            
            // If search parameter is provided, filter cities by name
            if (search) {
              const searchTerm = search.toString().toLowerCase();
              cities = cities.filter(city => 
                city.city_name.toLowerCase().includes(searchTerm)
              );
            }
            
            return res.json(cities);
          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Failed to fetch cities",);
          }
        });
// delete city 

export const updateCity = asyncHandler(async (req: Request, res: Response) => {
          try {
            const { id } = req.params;
            const { city_name } = req.body;

            const updatedCity = await updateCityService({
              id: Number(id),
              city_name,
            });

            return res.json({
              message: "City updated successfully",
              city: updatedCity,
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(400, error.message,);
          }
        });

export const deleteCity = asyncHandler(async (req: Request, res: Response) => {
         try {
            const { id } = req.params;

            await deleteCityService({
              id: Number(id),
            });

            return res.json({
              message: "City deleted successfully",
            });

          } catch (error: any) {
    if (error instanceof ApiError) throw error;
            throw new ApiError(400, error.message,);
          }
        });




