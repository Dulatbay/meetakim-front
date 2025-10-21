export type SignInitResponse = {
    sessionId: string;
    timestamp: number;
    signUrl: string;     // https://meet-akim.kz/api/sign/init?sessionId=123
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
    sessionId: string;
    status: "PENDING" | "SIGNED" | "FAILED" | string;
    createdAt?: string;
    updatedAt?: string;
    phoneNumber?: string | null;
    signedDocument?: string | null; // BASE64_SIGNATURE
};
