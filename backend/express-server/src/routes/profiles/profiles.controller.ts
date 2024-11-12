import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
var router = Router();
import passport, { Profile } from "passport";
import {
  arraySanitizer,
  escapeErrors,
  pictureCount,
  pictureExists,
  picturesNotExists,
  profileExists,
  profileExistsValidator,
  profileNotExists,
} from "../../utils/utils.js";
import { JFail } from "../../error-handlers/custom-errors.js";
import {
  blockedUsersRepository,
  likesRepository,
  profilesRepository,
  userReportsRepository,
} from "./profiles.repository.js";
import { interestsRepository } from "./interests.repository.js";
import { picturesRepository } from "./pictures.repository.js";
import {
  FilterBy,
  SearchPreferences,
  SortBy,
  SortOrder,
} from "./profiles.interface.js";
import { profilesService } from "./profiles.service.js";
import { userRepository } from "../users/users.repository.js";

/* 
Profiles - All users
-------------------
*/
/* Get list of profiles*/
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  query("sort_by").optional(),
  query("filter_by").optional(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const current_user = await profilesRepository.findOne(req.user.user_id);

      let filter: FilterBy = {};

      if (req.query.filter_by) {
        filter = new FilterBy(JSON.parse(req.query.filter_by));
        // Set value for location filter
        if (filter.location) {
          filter.location.value = {
            longitude: current_user.gps_longitude,
            latitude: current_user.gps_latitude,
          };
        }
      }

      let defaultFilter: FilterBy = {};
      if (process.env.DEFAULT_FILTER == "true") {
        defaultFilter = {
          gender: {
            $eq: current_user.sexual_preference,
          },
          location: {
            $lt: 100,
            value: {
              longitude: current_user.gps_longitude,
              latitude: current_user.gps_latitude,
            },
          },
          fame_rating: { $gte: 0 },
          common_interests: { $gte: 2 },
        };
      } else {
        // No default filter
        defaultFilter = {
          user_id: { $neq: current_user.user_id },
        };
      }

      const mergedFilter: FilterBy = {
        ...defaultFilter,
        ...filter, // customValues overrides defaultValues
      };

      let sort_by: SortBy = {};

      if (req.query.sort_by) {
        sort_by = new SortBy(JSON.parse(req.query.sort_by));
        // Set value for location sort
        if (sort_by.location) {
          sort_by.location.value = {
            longitude: current_user.gps_longitude,
            latitude: current_user.gps_latitude,
          };
        }
      }

      let defaultSortBy: SortBy = {};

      if (process.env.DEFAULT_SORT == "true") {
        defaultSortBy = {
          location: {
            value: {
              longitude: current_user.gps_longitude,
              latitude: current_user.gps_latitude,
            },
            $order: SortOrder.Asc,
          },
        };
      } else {
        // No default sort
        defaultSortBy = {
        };
      }

      const mergedSortBy: SortBy = {
        ...defaultSortBy,
        ...sort_by, // customValues overrides defaultValues
      };

      const search: SearchPreferences = {
        user_id: req.user.user_id,
        filter_by: mergedFilter,
        sort_by: mergedSortBy,
      };

      const profiles = await profilesService.searchProfiles(search);
      res.json({ message: "success", data: { profiles: profiles } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Get matches */
/* Get user matches */
router.get(
  "/matched",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  async function (req, res, next) {
    try {
      const matches = await likesRepository.findMatches(req.user.user_id);
      res.json({ message: "success", data: { matches: matches } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Get likes */
router.get(
  "/likes",
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
      const match = await likesRepository.find(req.user.user_id);
      res.json({ message: "success", data: { likes: match } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

// TODO: Implement profilesRepository.getProfile
/* Get profiles that I blocked */
router.get(
  "/blocks",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  async function (req, res, next) {
    try {
      const profile = await blockedUsersRepository.find(req.user.user_id);
      res.json({ message: "success", data: { blocks: profile } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

// TODO: Implement profilesRepository.getProfile
/* Get profiles that I reported */
router.get(
  "/reports",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  async function (req, res, next) {
    try {
      const profile = await userReportsRepository.find(req.user.user_id);

      res.json({ message: "success", data: { reports: profile } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* 
-------------------
*/

/* 
Me - Logged In User 
-------------------
*/
/* Get my user details*/
router.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  async function (req, res, next) {
    try {
      const profile = await profilesRepository.findOne(req.user.user_id);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Get user details*/
router.get(
  "/:user_id",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  param("user_id").isUUID(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const profile = await profilesRepository.findOne(req.params.user_id);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Create user profile*/
router.post(
  "/me",
  passport.authenticate("jwt", { session: false }),
  profileNotExists,
  body("gender").escape().isString().toLowerCase(),
  body("age").escape().isNumeric(),
  body("sexual_preference").escape().isString().toLowerCase(),
  body("biography").escape().isString(),
  body("profile_picture").isURL().custom(pictureExists),
  body("gps_latitude").escape().isNumeric(),
  body("gps_longitude").escape().isNumeric(),

  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      await profilesRepository.create({
        user_id: req.user.user_id,
        data: req.body,
      });
      // console.log(req.body["interests[]"]);
      res.json({ message: "success", data: { title: "Profile created" } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Update user profile*/
router.patch(
  "/me",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  body("gender").optional().escape().isString(),
  body("age").optional().escape().isNumeric(),
  body("sexual_preference").optional().escape().isString(),
  body("biography").optional().escape().isString(),
  body("profile_picture").optional().escape().isString(),
  body("gps_latitude").optional().escape().isNumeric(),
  body("gps_longitude").optional().escape().isNumeric(),

  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const profile = await profilesRepository.update({
        user_id: req.user.user_id,
        data: req.body,
      });
      // console.log(req.body["interests[]"]);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Get user interests*/
router.get(
  "/me/interests",
  passport.authenticate("jwt", { session: false }),
  async function (req, res, next) {
    try {
      const profile = await interestsRepository.find(req.user.user_id);
      res.json({ message: "success", data: { interests: profile } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Create user interests*/
router.post(
  "/me/interests",
  passport.authenticate("jwt", { session: false }),
  body("interests")
    .optional()
    .escape()
    .customSanitizer(arraySanitizer)
    .isArray({ max: 30 }),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const profile = await interestsRepository.add(
        req.user.user_id,
        req.body.interests
      );
      // console.log(req.body["interests[]"]);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Delete user interests*/
router.delete(
  "/me/interests",
  passport.authenticate("jwt", { session: false }),
  body("interests")
    .optional()
    .escape()
    .customSanitizer(arraySanitizer)
    .isArray({ max: 30 }),

  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const profile = await interestsRepository.remove(
        req.user.user_id,
        req.body.interests
      );
      // console.log(req.body["interests[]"]);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/*Get user pictures*/
router.get(
  "/me/pictures",
  passport.authenticate("jwt", { session: false }),
  async function (req, res, next) {
    try {
      const profile = await picturesRepository.find(req.user.user_id);
      res.json({ message: "success", data: { pictures: profile } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Create user pictures*/
router.post(
  "/me/pictures",
  passport.authenticate("jwt", { session: false }),
  body("pictures")
    .optional()
    .customSanitizer(arraySanitizer)
    .isArray({ max: 5 })
    .custom(picturesNotExists)
    .custom(pictureCount),

  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const profile = await picturesRepository.add(
        req.user.user_id,
        req.body.pictures
      );
      // console.log(req.body["interests[]"]);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Delete user pictures*/
router.delete(
  "/me/pictures",
  passport.authenticate("jwt", { session: false }),
  body("pictures").customSanitizer(arraySanitizer).isArray({ max: 5 }),

  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const profile = await interestsRepository.remove(
        req.user.user_id,
        req.body.pictures
      );
      // console.log(req.body["interests[]"]);
      res.json({ message: "success", data: profile });
    } catch (error) {
      next(error);
      return;
    }
  }
);
/* 
-------------------
*/

/* Like a user*/
router.post(
  "/:user_id/like",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  param("user_id").isUUID().custom(profileExistsValidator),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const match = await likesRepository.add(
        req.user.user_id,
        req.params.user_id
      );

      // Calculate new fame rating

      const likedProfile = await profilesRepository.findOne(req.params.user_id);
      let fame_rating = likedProfile.fame_rating + 1;
      // Increment fame rating of liked user
      await profilesRepository.update({data: {fame_rating: fame_rating}, user_id: req.params.user_id});
      res.json({ message: "success", data: { match: match } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Unlike a user*/
router.delete(
  "/:user_id/like",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  param("user_id").isUUID(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      const match = await likesRepository.remove(req.user.user_id, req.params.user_id);
      res.json({ message: "success", data: { match: match } });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Block a user*/
router.post(
  "/:user_id/block",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  param("user_id").isUUID(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      await blockedUsersRepository.add(req.user.user_id, req.params.user_id);

      res.json({ message: "success" });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Unblock a user*/
router.delete(
  "/:user_id/block",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  param("user_id").isUUID(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      await blockedUsersRepository.remove(req.user.user_id, req.params.user_id);
      res.json({ message: "success" });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Report a user*/
router.post(
  "/:user_id/report",
  passport.authenticate("jwt", { session: false }),
  profileExists,
  param("user_id").isUUID(),
  body("reason").isString(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      // Escape html tags in error messages for security
      const errors = escapeErrors(result.array());
      next(new JFail({ title: "invalid input", errors: errors }));
      return;
    }
    try {
      await userReportsRepository.add(
        req.user.user_id,
        req.params.user_id,
        req.body.reason
      );
      res.json({ message: "success" });
    } catch (error) {
      next(error);
      return;
    }
  }
);

export default router;
