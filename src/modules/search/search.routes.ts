import { Router } from "express";
import { SearchController } from "./search.controller";

const router = Router();

router.get("/", SearchController.searchEverything);

export const searchRouter = router;
