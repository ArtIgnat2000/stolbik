import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetLocalDatabaseForTests } from '../platform/database'
import { resetPWAStateForTests } from '../platform/pwa'
import { useAppStore } from '../state/store'
import { App } from '../ui/App'

beforeEach(async () => {
  await resetLocalDatabaseForTests()
  resetPWAStateForTests()
  localStorage.clear()
  useAppStore.setState({
    profiles: [],
    activeProfileId: null,
    isReady: false,
    isLoading: false,
    storageWarning: null
  })
})

async function solveParentGate(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const prompt = await screen.findByText(/Сколько будет/i)
  const strong = prompt.querySelector('strong')?.textContent ?? ''
  const match = strong.match(/(\d+)\s*\+\s*(\d+)/)
  const answer = Number(match?.[1] ?? 0) + Number(match?.[2] ?? 0)
  await user.type(screen.getByLabelText('Ответ на пример'), String(answer))
  await user.click(screen.getByRole('button', { name: 'Открыть настройки' }))
}

describe('разделы программы, ссылка и QR, сейф прогресса и автообновление', () => {
  it('переключает нижние разделы, открывает «Позови друга», 4 вкладки «Родителям» и проверяет обновление', async () => {
    const user = userEvent.setup()
    render(<App />)

    // На экране профиля уже есть компактный блок «Передать приложение» и кнопка проверки обновления
    expect(await screen.findByRole('heading', { name: 'Привет, будущий математик!' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Передать приложение' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Проверить обновление/ }))
    expect(await screen.findByText(/У вас самая свежая версия/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Имя ребёнка'), 'Миша')
    await user.click(screen.getByRole('button', { name: /Начать заниматься/ }))

    expect(await screen.findByRole('heading', { name: 'Считаем шаг за шагом' })).toBeInTheDocument()

    // Подсказка установки PWA
    expect(screen.getByText(/Добавь приложение на экран/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Понятно' }))
    expect(screen.queryByText(/Добавь приложение на экран/)).not.toBeInTheDocument()

    // «Позови друга 🤝» с главной
    await user.click(screen.getByRole('button', { name: 'Позвать друга' }))
    const inviteDialog = await screen.findByRole('dialog', { name: 'Позови друга' })
    expect(within(inviteDialog).getByAltText(/QR-код со ссылкой на приложение/)).toBeInTheDocument()
    await user.click(within(inviteDialog).getByRole('button', { name: 'Закрыть' }))

    // Раздел «Темы» (Справочник тем)
    const nav = screen.getByRole('navigation', { name: 'Разделы программы' })
    await user.click(within(nav).getByRole('button', { name: /Темы/ }))
    expect(await screen.findByRole('heading', { name: /Справочник тем/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Складываем и вычитаем/ }))
    const topicModal = await screen.findByRole('dialog', { name: /Тема 1:/ })
    expect(within(topicModal).getByTestId('column-display')).toBeInTheDocument()
    await user.click(within(topicModal).getByRole('button', { name: 'Закрыть' }))

    // Раздел «БУК» (магазин)
    await user.click(within(nav).getByRole('button', { name: /БУК/ }))
    expect(await screen.findByRole('heading', { name: 'Сделаем сову ещё наряднее' })).toBeInTheDocument()

    // Раздел «Родителям» и 4 вкладки (Обзор, Прогресс, Настройки, Приложение)
    await user.click(within(nav).getByRole('button', { name: /Родителям/ }))
    await solveParentGate(user)
    expect(await screen.findByRole('heading', { name: 'Прогресс и настройки' })).toBeInTheDocument()

    const parentTabs = screen.getByRole('tablist', { name: 'Разделы для родителей' })
    expect(within(parentTabs).getByRole('tab', { name: /Обзор/ })).toHaveAttribute('aria-selected', 'true')

    // Кнопка «Проверить обновление» прямо во вкладке «Обзор»
    await user.click(screen.getByRole('button', { name: /Проверить обновление/ }))
    expect(await screen.findByText(/У вас установлена актуальная версия приложения/i)).toBeInTheDocument()

    // Переключаемся на «Прогресс»
    await user.click(within(parentTabs).getByRole('tab', { name: /Прогресс/ }))
    expect(await screen.findByRole('heading', { name: 'Резервная копия' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Вернуть как было' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /\+ Сделать снимок/ }))
    expect(await screen.findByText(/Слот #1/)).toBeInTheDocument()

    // Переключаемся на «Настройки»
    await user.click(within(parentTabs).getByRole('tab', { name: /Настройки/ }))
    expect(await screen.findByRole('heading', { name: 'Настройки занятий' })).toBeInTheDocument()

    // Переключаемся на «Приложение» (Карточка «Обновление программы», QR-код и версия)
    await user.click(within(parentTabs).getByRole('tab', { name: /Приложение/ }))
    expect(await screen.findByRole('heading', { name: 'Обновление программы' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Передать приложение' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Показать QR-код крупно' }))
    expect(await screen.findByRole('dialog', { name: 'QR-код для передачи приложения' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Закрыть' }))

    // Проверяем плашку автоматического обновления и переключение кнопки на «Обновить сейчас»
    act(() => {
      window.dispatchEvent(new Event('stolbik:update'))
    })
    expect(await screen.findByText('Доступно обновление')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Обновить сейчас/ })).toBeInTheDocument()
  })
})
