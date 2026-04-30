// import { Router } from "express";
// import { auth } from "../../lib/auth";

// const router = Router();

// router.post("/logout", async (req, res) => {
//   try {
//     await auth.api.logout({
//       headers: req.headers as any,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Logged out successfully",
//     });
//   } catch (error) {
//     console.error("Logout error", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to logout",
//     });
//   }
// });

// export default router;
