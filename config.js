// ---- SUPABASE CONFIG ------------------------------------------------------
// Same Supabase project as the events map — different tables (see
// supabase/tenders.sql). The anon key is designed to be public; row level
// security decides what it may do: read tenders, post tenders and bids, and
// read bids only after a tender has closed (sealed bidding).
//
// Until the SQL in supabase/tenders.sql has been run, every write below fails
// harmlessly and the app keeps working entirely on this device (store.js
// mirrors everything to localStorage), so the flow can be demoed offline.
const MZ_SUPABASE_URL = "https://jkbdthmuarecvnszifuy.supabase.co";
const MZ_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYmR0aG11YXJlY3Zuc3ppZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MjcxMTcsImV4cCI6MjEwMjMwMzExN30.QOEuzdB3gywBMUaLxtNDy0Eh37_I-y-5Fl5K3nRtS6c";
