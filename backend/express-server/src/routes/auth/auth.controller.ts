import { Router } from "express";
var router = Router();
import { body, param, query, validationResult } from "express-validator";
import { JFail } from "../../error-handlers/custom-errors.js";
import lodash from "lodash";
import { login, resetPassword, sendPasswordResetEmail, verifyEmail } from "./auth.service.js";
import { isHtmlTagFree } from "../../utils/utils.js";
import { createAccount } from "../account/account.service.js";
import { createToken } from "../token/token.repository.js";
import { TokenType } from "../token/token.interface.js";
import { accountRepository } from "../account/account.repository.js";
const { unescape, escape } = lodash;

/* GET TEST */
router.get("/", function (req, res, next) {
  res.send("API is working properlyhhaa");
});

/* Create new account */
router.post(
  "/signup",
  body("firstName").notEmpty().escape(),
  body("lastName").notEmpty().escape(),
  body("username").notEmpty().custom(isHtmlTagFree),
  body("email").isEmail().custom(isHtmlTagFree),
  body("password").isStrongPassword(),

  async function (req, res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) {
      // Create new account
      try {
        const account = await createAccount({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
        });
        res.json(account);
        return;
      } catch (error) {
        next(error);
        return;
      }
    } else {
      // Escape html tags in error messages for security
      const errors = result.array().map((error) => {
        if (error.type === "field" && "value" in error) {
          error.value = escape(error.value);
        }
        return error;
      });
      next(new JFail({ title: "invalid input", errors: errors }));
    }
  }
);

/* Verify email */
router.patch(
  "/verify-email",
  body("token").notEmpty(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) {
      // Verify email

      try {
        await verifyEmail(req.query.token);
      } catch (error) {
        next(error);
        return;
      }

      res.json({ status: "success", data: { message: "Email verified" } });
    } else {
      next(new JFail({ title: "invalid input", errors: result.array() }));
    }
  }
);

/* Signs user in with existing account */
router.post(
  "/login",
  body("username").notEmpty(),
  body("password").notEmpty(),

  async function (req, res, next) {
    try {
      const result = await login({
        username: req.body.username,
        password: req.body.password,
      });

      // Set token in cookie
      res.cookie("jwt", result.data.token, {
        httpOnly: true,
        secure: true,
      });

      res.json(result);
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Send reset password email */
router.post(
  "/reset-password",
  body("email").isEmail().escape(),

  async function (req, res, next) {
    try {
      // Send reset password email
      const nextMonth = new Date();
      nextMonth.setDate(new Date().getDate() + 30);
      const user = await accountRepository.findOne({ email: req.body.email });
      const token = await createToken({
        user_id: user.user_id,
        token_type: TokenType.PasswordReset,
        expiry_date: nextMonth,
      });

      await sendPasswordResetEmail(
        req.body.email,
        `${req.protocol}://${req.get("host")}/reset-password?token=${
          token.token_id
        }`
      );
      res.json({
        status: "success",
        data: { message: "Reset password email sent" },
      });
    } catch (error) {
      next(error);
      return;
    }
  }
);

/* Reset password */
router.patch(
  "/reset-password",
  body("token").notEmpty(),
  body("password").isStrongPassword(),
  async function (req, res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) {
      // Reset password
      try {
        await resetPassword(req.body.token, req.body.password);
      } catch (error) {
        next(error);
        return;
      }

      res.json({ status: "success", data: { message: "Password reset" } });
    } else {
      next(new JFail({ title: "invalid input", errors: result.array() }));
    }
  }
);

export default router;
