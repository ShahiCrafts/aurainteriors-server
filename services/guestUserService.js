const User = require("../models/user.model");

/**
 * GuestUserService
 * Manages a special system guest user placeholder for proper message attribution
 * This allows guest messages to have a valid sender reference while maintaining
 * data integrity and enabling proper avatar display
 */

class GuestUserService {
  static guestUserId = null;
  static guestUserPromise = null;
  /**
   * Get or create the system guest user placeholder
   * Returns the same guest user ID for all guest sessions
   */
  static async getOrCreateGuestUser() {
    const guestEmail = "guest@aura-interiors.local";

    // Try to find existing guest user
    let guestUser = await User.findOne({ email: guestEmail }).select("_id").lean();

    // If doesn't exist, create it
    if (!guestUser) {
      try {
        guestUser = await User.create({
          email: guestEmail,
          firstName: "Guest",
          lastName: "User",
          role: "customer",
          isActive: true,
          isEmailVerified: false,
          password: null, // No password for guest user
          loginCount: 0,
        });
        console.log(`[GuestUserService] Created system guest user: ${guestUser._id}`);
      } catch (error) {
        // Handle unique constraint error - user might have been created by another request
        if (error.code === 11000) {
          guestUser = await User.findOne({ email: guestEmail }).select("_id").lean();
        } else {
          throw error;
        }
      }
    }

    return guestUser;
  }

  /**
   * Get guest user ID (cached or fresh)
   */
  static async getGuestUserId() {
    if (this.guestUserId) return this.guestUserId;
    // Collapse concurrent cold-start lookups into one DB operation. Subsequent guest
    // messages pay zero Mongo round trips for the shared placeholder identity.
    if (!this.guestUserPromise) {
      this.guestUserPromise = this.getOrCreateGuestUser()
        .then((guestUser) => {
          this.guestUserId = guestUser._id;
          return this.guestUserId;
        })
        .finally(() => { this.guestUserPromise = null; });
    }
    return this.guestUserPromise;
  }

  /**
   * Check if a user is the system guest placeholder
   */
  static isGuestUser(userId) {
    if (!userId) return false;
    return userId.toString() === this.guestUserId?.toString();
  }
}

module.exports = GuestUserService;
