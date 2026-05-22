export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: string;
        isAdmin: boolean;
        isGuest: boolean;
      };
    }
  }
}
