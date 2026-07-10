export const VALIDATION_MESSAGES = {
  required: "Preencha os campos obrigatórios.",
  invalidEmail: "Informe um e-mail válido.",
  invalidPassword: "A senha deve ter pelo menos 6 caracteres.",
  passwordMismatch: "As senhas não conferem.",
  invalidName: "Informe um nome válido.",
  invalidAmount: "Informe um valor maior que zero.",
  invalidDate: "Informe uma data válida.",
  invalidCategory: "Selecione uma categoria válida.",
  duplicateCategory: "Já existe uma categoria com esse nome.",
  saveError: "Não foi possível salvar. Tente novamente.",
  saveSuccess: "Salvo com sucesso.",
  deleteError: "Não foi possível excluir. Tente novamente.",
  deleteSuccess: "Excluído com sucesso.",
};

export const normalizeText = (value) => String(value ?? "").trim();

export const isValidEmail = (value) => {
  const email = normalizeText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
};

export const isValidDateString = (value) => {
  const text = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
