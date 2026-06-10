import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import appointmentsRouter from "./appointments";
import availabilityRouter from "./availability";
import adminRouter from "./admin";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(appointmentsRouter);
router.use(availabilityRouter);
router.use(adminRouter);
router.use(settingsRouter);

export default router;
