import { Router } from "express";
import passport from "passport";
import { escapeErrors, profileExists } from "../../../utils/utils.js";
import { validationResult } from "express-validator";
import { JFail } from "../../../error-handlers/custom-errors.js";
import { visitsRepository } from "./visits.repository.js";
import { notificationService } from "../../notifications/notifications.service.js";
import {
  NOTIFICATION_ENTITY_TYPE,
  NOTIFICATION_STATUS,
} from "../../notifications/notification.interface.js";

var router = Router();

/* Get likes */
router.get(
  "/visits",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const visit = await visitsRepository.find({
        visited_user_id: req.user.user_id,
      });
      res.json({ message: "success", data: { visits: visit } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Create a visit */
router.post(
  "/:user_id/visits",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const visit = await visitsRepository.create({
        visitor_user_id: req.user.user_id,
        visited_user_id: req.params.user_id,
      });
      // Notify the visited user
      await notificationService.create({
        entity_type: NOTIFICATION_ENTITY_TYPE.PROFILE_VIEW,
        entity_id: visit.visitor_user_id,
        status: NOTIFICATION_STATUS.SENT,
        receivers: [visit.visited_user_id],
        sender: visit.visitor_user_id,
      });
      res.json({ message: "success", data: { visit: visit } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

export default router;
