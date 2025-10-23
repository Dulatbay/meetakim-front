export type CreateSessionResponse = {
    id: number;
    sessionUuid: string;
    expiry: string;
    state: string;
    user: {
        id: number;
        iin: string;
        fullName: string;
        placeOfRegistrationCity: string;
        role: string;
        password: string;
    } | null;
    createdAt: string;
};

export type SignInitResponse = {
    sessionId: number;
    timestamp: number;
    signUrl: string;
    status: "OK" | string;
};

export type SignCallbackPayload = {
    sessionId: string;
    result: "SUCCESS" | "FAILED";
    signedDocument?: string; // BASE64_SIGNATURE
};

export type SignCallbackResponse = {
    sessionId: string;
    result: "SUCCESS" | "FAILED";
    signedDocument?: string;
};

export type SignStatusResponse = {
    id: number;
    sessionUuid: string;
    expiry: string;
    state: string;
    user: {
        id: number;
        iin: string;
        fullName: string;
        placeOfRegistrationCity: string;
        role: string;
        password: string;
    } | null;
    createdAt: string;
};
