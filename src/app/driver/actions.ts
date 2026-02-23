'use server';

export type GoOnlineBlocker = {
  code: string;
  title: string;
  detail?: string;
  action?: {
    cta: string;
    deeplink: string;
  };
};

export type GoOnlineResponse = {
  success: true;
  data: {
    allowed: boolean;
    blockers?: GoOnlineBlocker[];
  };
} | {
  success: false;
  error: string;
};

const GO_ONLINE_URL = 'https://api.kulooc.ca/v1/driver/go-online/attempt';

export async function goOnlineAttempt(): Promise<GoOnlineResponse> {
  const requestBody = {
    device_id: 'mock-device-id',
    app_version: '1.0.0',
    device_os: 'mock-os-17',
    gps: { lat: 45.5019, lng: -73.5674 },
  };
  try {
    // MOCK RESPONSE aligned with OpenAPI spec
    const mockData = {
      allowed: false,
      blockers: [
        {
          code: 'DOC_EXPIRED',
          title: 'Document expiré',
          action: {
            cta: 'Téléverser votre assurance',
            deeplink: '/driver/documents',
          },
          detail: "Votre police d'assurance a expiré le 15/02/2026. Veuillez en téléverser une nouvelle pour continuer à conduire.",
        },
      ],
    };
    return { success: true, data: mockData };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Go Online Attempt Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
