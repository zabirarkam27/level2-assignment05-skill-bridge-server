import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { auth } from "../../lib/auth";

const searchEverything = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });
    const role = session?.user ? (session.user as any).role : undefined;
    const result = await SearchService.searchEverything(req.query.q, role);

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
