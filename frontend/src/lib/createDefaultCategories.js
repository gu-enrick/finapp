import { createCategory } from "./api";

const DEFAULT_CATEGORIES = [
  { name: "Salário",       type: "income",  color: "#22c55e" },
  { name: "Transferência", type: "income",  color: "#10b981" },
  { name: "Mercado",       type: "expense", color: "#ef4444" },
  { name: "Aluguel",       type: "expense", color: "#dc2626" },
  { name: "Delivery",      type: "expense", color: "#f97316" },
  { name: "Combustível",   type: "expense", color: "#eab308" },
  { name: "Internet",      type: "expense", color: "#3b82f6" },
  { name: "Água",          type: "expense", color: "#06b6d4" },
  { name: "Luz",           type: "expense", color: "#fbbf24" },
  { name: "Telefonia",     type: "expense", color: "#ec4899" },
  { name: "Streaming",     type: "expense", color: "#8b5cf6" },
  { name: "Outros",        type: "both", color: "#94a3b8" }, 
];

export async function createDefaultCategories() {
  try {
    const results = await Promise.allSettled(
      DEFAULT_CATEGORIES.map(cat => createCategory(cat))
    );
    
    const created = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    
    console.log(`✅ ${created}/${DEFAULT_CATEGORIES.length} categorias padrão criadas.`);
    
    if (failed > 0) {
      console.warn(`⚠️ ${failed} categorias falharam ao serem criadas.`);
    }
    
    return created;
  } catch (error) {
    console.error("Erro fatal ao gerar categorias padrão:", error);
    return 0;
  }
}