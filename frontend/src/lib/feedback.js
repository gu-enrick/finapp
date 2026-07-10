export const getErrorMessage = (error, fallback = "Não foi possível concluir a operação.") => {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (error?.response?.status >= 500) return "O servidor demorou para responder. Tente novamente em alguns segundos.";
  if (error?.message?.includes("Network Error")) return "Falha de conexão. Verifique sua internet e tente novamente.";
  return fallback;
};

export const loadDraft = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveDraft = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

export const clearDraft = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
};
