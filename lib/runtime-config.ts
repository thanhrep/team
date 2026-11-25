export const runtimeConfig = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  googleSheetId: process.env.GOOGLE_SHEET_ID || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
};

export function integrationStatus() {
  return {
    supabase: Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseServiceRoleKey),
    googleSheets: Boolean(runtimeConfig.googleServiceAccountJson && runtimeConfig.googleSheetId),
    googleDrive: Boolean(runtimeConfig.googleServiceAccountJson && runtimeConfig.googleDriveFolderId),
    gemini: Boolean(runtimeConfig.geminiApiKey),
    gpt: Boolean(runtimeConfig.openAiApiKey),
  };
}
