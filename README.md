# MeetAkim Frontend v2.0

Фронтенд-приложение для системы видеоконференций "Встреча с акимом" с интеграцией QBox Meet и eGov Mobile.

## 🎯 Описание

Система предназначена для организации онлайн-встреч граждан с акимом через видеоконференции QBox Meet с использованием электронной подписи через eGov Mobile.

### Три типа пользователей:

1. **👤 Граждане** - авторизуются через eGov Mobile, получают прямую ссылку на встречу в комнате r1
2. **👨‍💼 Администратор** - создает и модерирует приемную комнату r1 (admin_almati)
3. **🎩 Аким** - создает и проводит встречи в своей комнате r2 (akim_almati)

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview
```

## 📱 Страницы приложения

### Для граждан:
- `/` - Ввод номера телефона
- `/login` - Авторизация через eGov Mobile с QR кодом

### Для администратора:
- `/admin/login` - Вход в панель администратора
- `/admin` - Панель администратора (вход в комнату r1)

### Для акима:
- `/akim/login` - Вход в панель акима
- `/akim` - Панель акима (вход в комнату r2)

## 🔧 Конфигурация

Настройте BASE_URL в файле `src/api/axiosInstance.ts`:

```typescript
const BASE_URL = "http://localhost:8080"; // для разработки
// const BASE_URL = "https://meet-akim.kz"; // для production
```

## 📡 API Endpoints

### Граждане (eGov Mobile + QBox)
- `POST /api/sign/create_session` - Создание сессии
- `GET /api/qr` - Генерация QR кода
- `GET /api/sign/status` - Проверка статуса подписи
- `GET /api/egov-mobile-url` - Ссылка для eGov Mobile
- `GET /api/qbox/meeting-url` - Получение ссылки на встречу (комната r1)

### Администратор (QBox Bridge)
- `GET /api/qbox/admin-meeting-url` - Вход в комнату r1
- `POST /api/qbox/ensure-admin-meeting` - Создать комнату r1
- `GET /api/qbox/health` - Проверка статуса комнаты r1
- `GET /api/qbox/meeting-info` - Информация о встрече

### Аким (QBox Bridge)
- `GET /api/qbox/akim-meeting-url` - Вход в комнату r2
- `POST /api/qbox/ensure-akim-meeting` - Создать комнату r2
- `GET /api/qbox/health-akim` - Проверка статуса комнаты r2

## 🎨 Технологии

- **React 19** - UI библиотека
- **TypeScript** - Типизация
- **Vite** - Сборщик
- **TailwindCSS** - Стилизация
- **React Router** - Маршрутизация
- **Axios** - HTTP клиент
- **Sonner** - Toast уведомления

## 📂 Структура проекта

```
src/
├── api/
│   ├── axiosInstance.ts      # Axios конфигурация
│   └── endpoints/
│       ├── qbox.ts           # QBox Meet API
│       └── sign.ts           # eGov Mobile API
├── components/
│   └── RequireAuth.tsx       # HOC для защиты роутов
├── pages/
│   ├── PhoneInputPage.tsx    # Главная (ввод телефона)
│   ├── LoginPage.tsx         # eGov авторизация
│   ├── AdminLoginPage.tsx    # Логин админа
│   ├── AdminPage.tsx         # Панель админа
│   ├── AkimLoginPage.tsx     # Логин акима
│   └── AkimPage.tsx          # Панель акима
├── types/
│   └── sign.t.ts            # TypeScript типы
├── utils/
│   ├── session.ts           # Генерация UUID
│   └── tokenUtils.ts        # Управление токенами
└── App.tsx                  # Главный компонент с роутингом
```

## 🔐 Авторизация

### Для граждан:
- Электронная подпись через eGov Mobile
- Два варианта входа: QR код или прямая ссылка

### Для администратора/акима:
- HTTP Basic Auth
- Учетные данные хранятся в localStorage (Base64)

## 🌐 QBox Meet интеграция

### Комнаты:
- **r1** (Приемная комната): создается админом, граждане получают токен участника
- **r2** (Комната акима): создается акимом, используется для персональных встреч

### Коды комнат:
- Формат: `r1:YYYY-MM-DD` или `r2:YYYY-MM-DD`
- Обновляются автоматически каждый день

## 📚 Документация

Полная документация доступна в папке `docs/`:
- `FRONTEND_INTEGRATION_GUIDE.md` - Подробное руководство по интеграции
- `FRONTEND_QUICKSTART_CHEATSHEET.md` - Быстрая шпаргалка
- `FRONTEND_FLOW_DIAGRAMS.md` - Диаграммы флоу
- `POSTMAN_GUIDE_V2.md` - Тестирование через Postman

## 🛠️ Разработка

### Полезные команды:

```bash
# Линтинг
npm run lint

# Проверка типов
npx tsc --noEmit
```

## 📝 Changelog v2.0

### ✨ Добавлено:
- ✅ Интеграция с QBox Meet (две комнаты r1/r2)
- ✅ Страница для акима (`/akim`)
- ✅ Прямой переход на встречу после eGov авторизации
- ✅ Health check для комнат
- ✅ Автоматическое обновление статуса комнат

### 🗑️ Удалено:
- ❌ Система очередей (QueuePage)
- ❌ Страница завершения (CompletedPage)
- ❌ API управления очередью

### 🔄 Изменено:
- 🔄 LoginPage - теперь сразу переход на встречу
- 🔄 AdminPage - убрана панель модерации очереди, добавлен вход в комнату
- 🔄 Роутинг - упрощен до 3 основных флоу

## 🐛 Troubleshooting

### Проблема: "Meeting not found"
**Решение:** Администратор должен сначала создать комнату r1 через `/admin`

### Проблема: "QBox service unavailable"
**Решение:** Проверьте доступность QBox API и правильность credentials в backend

### Проблема: "Session not signed"
**Решение:** Убедитесь, что пользователь завершил подписание в eGov Mobile

## 📞 Поддержка

Для получения помощи обратитесь к:
- Backend API документации: `http://localhost:8080/swagger-ui/index.html`
- Postman коллекции в папке `docs/`

## 📄 Лицензия

Proprietary - MeetAkim Project

---

**Версия:** 2.0  
**Дата:** 10 февраля 2026  
**Stack:** React 19 + TypeScript + Vite + TailwindCSS
