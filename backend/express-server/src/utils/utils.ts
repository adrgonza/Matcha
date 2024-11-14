import pgPromise from "pg-promise";
import {
  FilterBy,
  FilterItem,
  SortBy,
  SortItem,
} from "../routes/profiles/profiles.interface.js";
import {
  blockedUsersRepository,
  likesRepository,
  profilesRepository,
} from "../routes/profiles/profiles.repository.js";
import { userRepository } from "../routes/users/users.repository.js";
import { JFail } from "../error-handlers/custom-errors.js";
import _, { pick } from "lodash";
import { picturesRepository } from "../routes/profiles/pictures.repository.js";
import { Picture } from "../routes/profiles/pictures.interface.js";
import {
  likesService,
  profilesService,
} from "../routes/profiles/profiles.service.js";
const { unescape, escape, pickBy } = _;
const pgp = pgPromise({
  /* Initialization Options */
});

export async function arraySanitizer(value) {
  if (value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((interest) => interest.toLowerCase());
  } else {
    return [value.toLowerCase()];
  }
}

export async function profileBlocked(value, { req }) {
  // Check if the block already exists
  const existingBlockedUser = await blockedUsersRepository.findOne(
    req.user.user_id,
    value
  );
  if (existingBlockedUser) {
    throw new Error("You already blocked this user");
  }
}

export async function profileNotBlocked(value, { req }) {
  // Check if the block already exists
  const existingBlockedUser = await blockedUsersRepository.findOne(
    req.user.user_id,
    value
  );
  if (!existingBlockedUser) {
    throw new Error("You have not blocked this user");
  }
}

export async function profileLiked(value, { req }) {
  // Check if the block already exists
  const existingLikedUser = await likesService.hasLiked(
    req.user.user_id,
    value
  );
  if (!existingLikedUser) {
    throw new Error("You have not liked this user");
  }
}

export async function profileNotLiked(value, { req }) {
  // Check if the block already exists
  const existingLikedUser = await likesService.hasLiked(
    req.user.user_id,
    value
  );
  if (existingLikedUser) {
    throw new Error("You already liked this user");
  }
}

export async function likeExists(value, { req }) {
  // Check if the block already exists
  const existingLike = await likesRepository.findLike(req.user.user_id, value);
  if (!existingLike) {
    throw new Error("Like does not exist");
  }
}

export async function pictureExists(value, { req }) {
  const user_id = req.user.user_id;
  const picture_id = value;

  await profilesService.pictureExists(picture_id, user_id);
}

export async function picturesNotExists(value: Array<string>, { req }) {
  const user_id = req.user.user_id;
  const uploadPictures = value;

  await profilesService.picturesNotExist(uploadPictures, user_id);
}

export async function pictureCount(value: Array<string>, { req }) {
  const user_id = req.user.user_id;
  const userPictures = await picturesRepository.find(user_id);

  if (userPictures.length + value.length > 5) {
    throw new Error("Cannot have more than 5 pictures");
  }
}

export async function profileNotExists(req, res, next) {
  const user_id = req.user.user_id;
  const profile = await profilesRepository.findOne(user_id);
  if (profile) {
    next(new JFail("profile already exists"));
  }
  next();
}

export async function profileExists(req, res, next) {
  const user_id = req.user.user_id;
  const profile = await profilesRepository.findOne(user_id);
  if (!profile) {
    next(new JFail("profile not found"));
  }
  next();
}

export async function profileExistsValidator(value) {
  const profile = await profilesRepository.findOne(value);
  if (!profile) {
    throw new Error("profile not found");
  }
}

export async function usernameNotExists(value) {
  const user = await userRepository.findOne({ username: value });
  if (user) {
    throw new Error("username already exists");
  }
  return true;
}

export async function emailNotExists(value) {
  const user = await userRepository.findOne({ email: value });
  if (user) {
    throw new Error("email already exists");
  }
  return true;
}

export function isHtmlTagFree(value) {
  if (!value || typeof value !== "string" || value.length === 0) {
    return true;
  }

  if (escape(value) !== value) {
    throw new Error("cannot contain html tags");
  }
  return true;
}

export async function emailVerified(value: string) {
  const EmailVerificationDisabled = process.env.EMAIL_VERIFICATION === "false";
  if (EmailVerificationDisabled) {
    return true;
  }

  const user = await userRepository.findOne({
    username: value,
    email: value,
  });

  if (!user) {
    throw new Error("user not found");
  }

  if (!user.is_email_verified) {
    throw new Error("email not verified");
  }

  return true;
}

export function escapeErrors(errors) {
  return errors.map((error) => {
    if (
      error.type === "field" &&
      "value" in error &&
      typeof error.value === "string"
    ) {
      error.value = escape(error.value);
    }
    return error;
  });
}

export class FilterSet {
  private readonly filtersMap: Record<string, string> = {
    $eq: "=",
    $neq: "!=",
    $gt: ">",
    $gte: ">=",
    $lt: "<",
    $lte: "<=",
    $like: "LIKE",
    $ilike: "ILIKE",
    $in: "IN",
    $nin: "NOT IN",
    $contains: "@>",
    $contained: "<@",
    $overlap: "&&",
    $exists: "IS NOT NULL",
    $nexists: "IS NULL",
  };

  filters: FilterBy;
  rawType = true;

  constructor(filters: FilterBy) {
    if (!filters || typeof filters !== "object") {
      throw new TypeError("Parameter 'filters' must be an object.");
    }

    // Clean and validate filters
    this.filters = _.omitBy(pickBy(filters), _.isEmpty);
    if (_.isEmpty(this.filters)) {
      throw new Error("Invalid filter");
    }

    // Validate each filter item
    if (
      !Object.values(this.filters).every((item) => typeof item === "object")
    ) {
      throw new Error("Each filter item must be an object");
    }
  }

  private formatLocation(
    filterItem: FilterItem,
    operator: string,
    radius: number
  ) {
    const { longitude, latitude } = filterItem.value;
    return `location <-> ST_Point(${pgp.as.value(longitude)}, ${pgp.as.value(
      latitude
    )})::geography ${operator} ${pgp.as.value(radius)}`;
  }

  toPostgres() {
    return _.map(this.filters, (filterItem: FilterItem, filterKey: string) => {
      const formattedFilters = _.map(
        _.omit(filterItem, "value"),
        (value, operatorKey) => {
          const operator = this.filtersMap[operatorKey];
          if (!operator) {
            throw new Error("Invalid filter operator");
          }

          if (filterKey === "location") {
            return this.formatLocation(filterItem, operator, 1000);
          }

          return `${pgp.as.name(filterKey)} ${operator} ${pgp.as.format(
            "$1",
            value
          )}`;
        }
      ).join(" AND ");

      return _.size(filterItem) > 1
        ? `(${formattedFilters})`
        : formattedFilters;
    }).join(" AND ");
  }
}

export class SortSet {
  private readonly sortMap: Record<string, string> = {
    asc: "ASC",
    desc: "DESC",
  };

  sorts: SortBy;
  rawType = true;

  constructor(sorts: SortBy) {
    if (!sorts || typeof sorts !== "object") {
      throw new TypeError("Parameter 'sorts' must be an object.");
    }

    // Clean and validate sorts
    this.sorts = _.omitBy(pickBy(sorts), _.isEmpty);
    if (_.isEmpty(this.sorts)) {
      throw new Error("Invalid sort configuration");
    }

    // Validate each filter item
    if (!Object.values(this.sorts).every((item) => typeof item === "object")) {
      throw new Error("Each filter item must be an object");
    }
  }

  private formatLocation(sortItem: SortItem, sqlKeyword: string) {
    const { longitude, latitude } = sortItem.value;
    return `location <-> ST_Point(${pgp.as.value(longitude)}, ${pgp.as.value(
      latitude
    )})::geography ${sqlKeyword}`;
  }

  toPostgres() {
    return _.map(this.sorts, (sortItem: SortItem, key: string) => {
      if (typeof sortItem !== "object") {
        throw new Error("Sort item must be an object");
      }

      const order = sortItem.$order;
      const sqlKeyword = this.sortMap[order];
      if (!sqlKeyword) {
        throw new Error("Invalid sort order");
      }

      return key === "location"
        ? this.formatLocation(sortItem, sqlKeyword)
        : `${pgp.as.name(key)} ${sqlKeyword}`;
    }).join(", ");
  }
}
