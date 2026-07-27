import { test, expect } from '@playwright/test';

test.describe('Fluxo de Autenticação - Estilo Backend', () => {

  test('Deve aceitar os termos e logar com sucesso usando a Conta Demo', async ({ page }) => {
    // 1. Inicia o app, passa pela tela de consentimento e vai para a tela de login
    await page.goto('http://localhost:5173');

    // 2. Clica no botão de consentimento exato da sua tela
    await page.getByRole('button', { name: /li e concordo/i }).click();

    // 3. Agora na tela de Login, clica no botão de visitante/demo
    await page.getByRole('button', { name: /visitante/i }).click();

    // 4. Aguarda carregar e verifica se a tela principal (Dashboard) apareceu
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible({ timeout: 15000 });
  });

});