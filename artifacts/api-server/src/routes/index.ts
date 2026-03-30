import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { authRouter } from "./auth";
import { examsRouter } from "./exams";
import { adminRouter } from "./admin";
import { questionsRouter } from "./questions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/exams", examsRouter);
router.use("/admin", adminRouter);
router.use("/questions", questionsRouter);

export default router;
