import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export interface ThreeDSecureChallenge {
  id: string;
  transactionId: string;
  challengeUrl: string;
  acsUrl: string;
  paReq: string;
  expiresAt: Date;
}

export interface ThreeDSecureVerification {
  success: boolean;
  authenticated: boolean;
  transactionId: string;
  eci?: string;
  cavv?: string;
  xid?: string;
}

export class ThreeDSecureService {
  /**
   * Initiate 3D Secure authentication flow
   */
  async initiateAuthentication(
    transactionId: string,
    cardNumber: string,
    amount: number,
    currency: string
  ): Promise<ThreeDSecureChallenge> {
    try {
      logger.info(`Initiating 3DS authentication for transaction: ${transactionId}`);

      // Check if transaction requires 3DS
      const requiresAuth = await this.requires3DSecure(cardNumber);

      if (!requiresAuth) {
        throw new Error('Transaction does not require 3D Secure authentication');
      }

      // Generate challenge data
      const challengeId = this.generateChallengeId();
      const paReq = this.generatePaReq(transactionId, amount, currency);
      const acsUrl = this.getAcsUrl(cardNumber);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store 3DS record in database
      await prisma.threeDSecure.create({
        data: {
          id: challengeId,
          transactionId,
          status: 'REQUIRED' as any,
          acsUrl,
          paReq,
          cardLast4: cardNumber.slice(-4),
          amount,
          currency,
          expiresAt,
        } as any,
      });

      const challengeData: ThreeDSecureChallenge = {
        id: challengeId,
        transactionId,
        challengeUrl: `/3ds/challenge/${challengeId}`,
        acsUrl,
        paReq,
        expiresAt,
      };

      logger.info(`3DS challenge created: ${challengeId}`);
      return challengeData;
    } catch (error: any) {
      logger.error('Failed to initiate 3DS authentication:', error);
      throw new Error(`3DS initiation failed: ${error.message}`);
    }
  }

  /**
   * Verify 3D Secure authentication response
   */
  async verifyAuthentication(
    challengeId: string,
    paRes: string
  ): Promise<ThreeDSecureVerification> {
    try {
      logger.info(`Verifying 3DS authentication: ${challengeId}`);

      // Get 3DS record
      const threeDSecure = await prisma.threeDSecure.findUnique({
        where: { id: challengeId },
      });

      if (!threeDSecure) {
        throw new Error('3DS challenge not found');
      }

      if (threeDSecure.status !== 'REQUIRED') {
        throw new Error('3DS challenge already processed');
      }

      if (new Date() > (threeDSecure as any).expiresAt) {
        await this.updateStatus(challengeId, 'EXPIRED' as any);
        throw new Error('3DS challenge expired');
      }

      // Verify PaRes (Payment Authentication Response)
      const verification = this.verifyPaRes(paRes);

      // Update status based on verification
      const status = verification.authenticated ? 'AUTHENTICATED' : 'FAILED';
      await this.updateStatus(challengeId, status, {
        eci: verification.eci,
        cavv: verification.cavv,
        xid: verification.xid,
      });

      logger.info(`3DS verification complete: ${challengeId} - ${status}`);

      return {
        success: true,
        authenticated: verification.authenticated,
        transactionId: threeDSecure.transactionId as string,
        eci: verification.eci ?? undefined,
        cavv: verification.cavv ?? undefined,
        xid: verification.xid ?? undefined,
      };
    } catch (error: any) {
      logger.error('Failed to verify 3DS authentication:', error);
      throw new Error(`3DS verification failed: ${error.message}`);
    }
  }

  /**
   * Get 3DS authentication status
   */
  async getAuthenticationStatus(challengeId: string): Promise<any> {
    try {
      const threeDSecure = await prisma.threeDSecure.findUnique({
        where: { id: challengeId },
      });

      if (!threeDSecure) {
        throw new Error('3DS challenge not found');
      }

      return {
        id: threeDSecure.id,
        transactionId: threeDSecure.transactionId,
        status: threeDSecure.status,
        authenticated: threeDSecure.status === ('AUTHENTICATED' as any),
        expiresAt: (threeDSecure as any).expiresAt,
      };
    } catch (error: any) {
      logger.error('Failed to get 3DS status:', error);
      throw error;
    }
  }

  /**
   * Check if card requires 3D Secure
   */
  private async requires3DSecure(cardNumber: string): Promise<boolean> {
    // Test card that requires 3DS: 4000002500003155 (Stripe test card)
    if (cardNumber === '4000002500003155') {
      return true;
    }

    // Check if card BIN is enrolled in 3DS
    const bin = cardNumber.substring(0, 6);

    // Simulate BIN lookup - in production, this would query actual 3DS directory
    // Cards starting with 400000 typically support 3DS
    return bin.startsWith('400000');
  }

  /**
   * Generate Payment Authentication Request (PaReq)
   */
  private generatePaReq(transactionId: string, amount: number, currency: string): string {
    const data = {
      transactionId,
      amount,
      currency,
      timestamp: Date.now(),
    };

    // In production, this would be base64-encoded XML
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Get Access Control Server (ACS) URL for the card network
   */
  private getAcsUrl(cardNumber: string): string {
    // Determine card network
    if (cardNumber.startsWith('4')) {
      return 'https://acs.visa.com/authenticate';
    } else if (cardNumber.startsWith('5')) {
      return 'https://acs.mastercard.com/authenticate';
    } else if (cardNumber.startsWith('3')) {
      return 'https://acs.americanexpress.com/authenticate';
    }
    return 'https://acs.simulator.com/authenticate';
  }

  /**
   * Verify Payment Authentication Response (PaRes)
   */
  private verifyPaRes(paRes: string): {
    authenticated: boolean;
    eci?: string;
    cavv?: string;
    xid?: string;
  } {
    try {
      // In production, this would decode and validate the PaRes XML
      JSON.parse(Buffer.from(paRes, 'base64').toString());

      // Simulate authentication success (80% success rate)
      const authenticated = Math.random() > 0.2;

      if (authenticated) {
        return {
          authenticated: true,
          eci: '05', // ECI 05 = Full authentication
          cavv: this.generateCAVV(),
          xid: this.generateXID(),
        };
      } else {
        return {
          authenticated: false,
          eci: '07', // ECI 07 = Authentication failed
        };
      }
    } catch (error) {
      logger.error('Invalid PaRes format:', error);
      return { authenticated: false };
    }
  }

  /**
   * Update 3DS authentication status
   */
  private async updateStatus(
    challengeId: string,
    status: string,
    authData?: { eci?: string; cavv?: string; xid?: string }
  ): Promise<void> {
    await prisma.threeDSecure.update({
      where: { id: challengeId },
      data: {
        status: status as any,
        eci: authData?.eci,
        cavv: authData?.cavv,
        xid: authData?.xid,
        authenticatedAt: status === 'AUTHENTICATED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Generate Challenge ID
   */
  private generateChallengeId(): string {
    return `3ds_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate Cardholder Authentication Verification Value (CAVV)
   */
  private generateCAVV(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let cavv = '';
    for (let i = 0; i < 28; i++) {
      cavv += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return cavv;
  }

  /**
   * Generate Transaction Identifier (XID)
   */
  private generateXID(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let xid = '';
    for (let i = 0; i < 20; i++) {
      xid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return xid;
  }

  /**
   * Clean up expired 3DS challenges
   */
  async cleanupExpiredChallenges(): Promise<number> {
    try {
      const result = await prisma.threeDSecure.updateMany({
        where: {
          status: 'REQUIRED' as any,
          expiresAt: { lt: new Date() },
        } as any,
        data: {
          status: 'EXPIRED' as any,
        },
      });

      logger.info(`Cleaned up ${result.count} expired 3DS challenges`);
      return result.count;
    } catch (error: any) {
      logger.error('Failed to cleanup expired 3DS challenges:', error);
      return 0;
    }
  }
}
