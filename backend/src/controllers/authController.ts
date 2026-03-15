import { Request, Response } from 'express';
import { AuthService, LoginDto } from '../services/authService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginData: LoginDto = req.body;

      if (!loginData.username || !loginData.password) {
        res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
        return;
      }

      const result = await this.authService.login(loginData);

      res.status(200).json({
        success: true,
        data: {
          token: result.token,
          user: result.user,
        },
      });
    } catch (error: any) {
      const msg = String(error?.message ?? '');
      const isDbError = error?.name === 'MongooseError' || /buffering|timed out|connection|ECONNREFUSED|ENOTFOUND/i.test(msg);
      if (isDbError) {
        console.error('Login error (database):', error?.message);
        res.status(503).json({
          success: false,
          message: 'Database unavailable. Please ensure MongoDB is running (e.g. mongod or MongoDB service) and try again.',
        });
        return;
      }
      if (msg === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          message: 'Invalid username or password',
        });
        return;
      }
      if (msg === 'User account is inactive') {
        res.status(403).json({
          success: false,
          message: 'User account is inactive',
        });
        return;
      }
      if (msg.includes('store is inactive') || msg.includes('inactive')) {
        res.status(403).json({
          success: false,
          message: msg || 'Your store is inactive. Please contact administrator.',
        });
        return;
      }
      console.error('Login error:', error);
      const safeMessage = msg.trim() || 'An unexpected error occurred. Please try again.';
      res.status(500).json({
        success: false,
        message: safeMessage,
      });
    }
  };
}
