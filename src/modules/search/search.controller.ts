import { Request, Response } from "express";
import { SearchService } from "./search.service";

const searchEverything = async (req: Request, res: Response) => {
  try {
    const result = await SearchService.searchEverything(req.query.q);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Search failed",
    });
  }
};

export const SearchController = {
  searchEverything,
};
