import db, { pgp } from "../../config/db-config.js";
import { JFail } from "../../error-handlers/custom-errors.js";
import { Picture } from "./pictures.interface.js";
import { Profile } from "./profiles.interface.js";
import { profilesRepository } from "./profiles.repository.js";
import { profilesService } from "./profiles.service.js";

export const picturesRepository = {
  find: async function find(user_id: string): Promise<Picture[]> {
    const pictures = await db.manyOrNone(
      `
              SELECT *
              FROM user_pictures
              WHERE user_id = $1
          `,
      [user_id]
    );

    return pictures;
  },

  add: async function add(
    user_id: string,
    pictures: string[]
  ): Promise<Profile> {
    // Creating a reusable/static ColumnSet for generating INSERT queries:
    const cs = new pgp.helpers.ColumnSet(["user_id", "picture_url"], {
      table: "user_pictures",
    });

    const data = pictures.map((picture) => ({
      user_id: user_id,
      picture_url: picture,
    }));

    const insert = pgp.helpers.insert(data, cs);

    await db.none(insert);

    return await profilesService.getProfile(user_id);
  },

  remove: async function remove(
    user_id: string,
    pictures: string[]
  ): Promise<Profile> {
    // Creating a reusable/static ColumnSet for generating INSERT queries:
    const cs = new pgp.helpers.ColumnSet(["user_id", "picture_url"], {
      table: "user_pictures",
    });

    const data = pictures.map((picture) => ({
      user_id: user_id,
      picture_url: picture,
    }));

    const values = pgp.helpers.values(data, cs);

    await db.none(
      `
              DELETE FROM user_pictures
              WHERE (user_id, picture_url) IN ($1:raw)
          `,
      [values]
    );

    return await profilesService.getProfile(user_id);
  },
};
