/**
 * SGC SETEG - Sistema de Gestão Cartográfica
 * Ano: 2026
 * Empresa: SETEG
 *
 * Cliente Supabase — instância única compartilhada em toda a aplicação
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
