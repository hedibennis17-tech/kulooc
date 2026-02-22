'use server';

// Based on the DB schema and UI, let's define the document type
export type DriverDocument = {
  id: string;
  name: string; // User-friendly name from doc_type
  doc_type: string;
  status: 'Approved' | 'Rejected' | 'Pending' | 'Required' | 'Expiring';
  expiry_date: string | null; // ISO date string
  rejection_reason: string | null;
  file_url: string | null;
};

export type GetDocumentsResponse = {
    success: true;
    data: DriverDocument[];
} | {
    success: false;
    error: string;
};

export type GetDocumentResponse = {
    success: true;
    data: DriverDocument;
} | {
    success: false;
    error: string;
};

const DOCUMENT_TYPE_MAP: { [key: string]: string } = {
    license: "Permis de conduire",
    insurance: "Assurance du véhicule",
    registration: "Immatriculation",
    inspection: "Inspection du véhicule",
    profile_photo: "Photo de profil",
};

// This function mimics the status logic described in the DB schema and UI.
// 'expiring' is a derived status.
const getStatus = (doc: { status: string, expiry_date: string | null }): DriverDocument['status'] => {
    if (doc.status === 'approved' && doc.expiry_date) {
        const expiry = new Date(doc.expiry_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        if (expiry < thirtyDaysFromNow) {
            return 'Expiring';
        }
        return 'Approved';
    }

    switch (doc.status) {
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        case 'pending': return 'Pending';
        case 'uploaded': return 'Pending'; // Treat uploaded as pending for UI
        case 'required': return 'Required';
        default: return 'Required';
    }
};

const mockApiData = [
    { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', doc_type: 'license', status: 'approved', expiry_date: '2026-10-24T00:00:00.000Z', rejection_reason: null, file_url: "https://example.com/doc.pdf" },
    { id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bee', doc_type: 'insurance', status: 'rejected', expiry_date: null, rejection_reason: "Photo floue ou illisible. Assurez-vous que l'image est nette et que tout le texte est facile à lire.", file_url: "https://example.com/doc.pdf" },
    { id: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bef', doc_type: 'registration', status: 'pending', expiry_date: '2025-08-15T00:00:00.000Z', rejection_reason: null, file_url: "https://example.com/doc.pdf" },
    { id: '4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4beg', doc_type: 'inspection', status: 'required', expiry_date: null, rejection_reason: null, file_url: null },
    { id: '5b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4beh', doc_type: 'profile_photo', status: 'approved', expiry_date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), rejection_reason: null, file_url: "https://example.com/doc.pdf" },
];

const formattedMockData: DriverDocument[] = mockApiData.map(doc => ({
    id: doc.id,
    doc_type: doc.doc_type,
    name: DOCUMENT_TYPE_MAP[doc.doc_type] || doc.doc_type,
    status: getStatus(doc),
    expiry_date: doc.expiry_date,
    rejection_reason: doc.rejection_reason,
    file_url: doc.file_url,
}));


// Mocking the API endpoint GET /v1/documents
export async function getDocuments(): Promise<GetDocumentsResponse> {
    try {
        return { success: true, data: formattedMockData };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Get Documents Error:", errorMessage);
        return { success: false, error: errorMessage };
    }
}

// Mocking getting a single document
export async function getDocument(id: string): Promise<GetDocumentResponse> {
    try {
        const document = formattedMockData.find(doc => doc.id === id);
        if (document) {
            return { success: true, data: document };
        } else {
            return { success: false, error: "Document non trouvé." };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error("Get Document Error:", errorMessage);
        return { success: false, error: errorMessage };
    }
}
