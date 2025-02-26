package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// Структуры для работы с данными
type Account struct {
	ID       int    `json:"id"`
	Login    string `json:"login"`
	Password string `json:"password"`
	Email    string `json:"email"`
}

type Trip struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	ImagePath string `json:"image_path"`
}

type UserCart struct {
	ID       int
	UserID   int
	TripID   int
	Quantity int
}

// Константы для подключения к базе данных и JWT
const (
	host      = "localhost"
	port      = 5432
	user      = "postgres"
	password  = "89858243234"
	dbname    = "booking"
	jwtSecret = "your_secret_key"
	uploadDir = "./uploads" // Папка для загрузки изображений
)

var db *sql.DB

func main() {
	// Подключение к базе данных
	connStr := fmt.Sprintf("host=%s port=%d user=%s dbname=%s password=%s sslmode=disable",
		host, port, user, dbname, password)
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Ошибка подключения к базе данных: %v", err)
	}
	defer db.Close()

	// Проверка подключения к базе данных
	if err := db.Ping(); err != nil {
		log.Fatalf("Ошибка подключения к базе данных: %v", err)
	}

	// Настройка маршрутов
	r := gin.Default()

	// Указываем путь к папке uploads
	r.Static("/uploads", uploadDir)

	// Подключаем CORS-мидлвар
	r.Use(corsMiddleware())

	// Маршруты для путевок
	r.POST("/add-trip", addTripHandler)
	r.GET("/api/trips", getTripsHandler)
	r.DELETE("/api/trips/:id", handleDeleteTrip)
	r.GET("/api/trips/:id", getTripByIDHandler)

	// Маршруты для аккаунтов
	r.GET("/aaccounts", getAccounts)
	r.POST("/account", postAccount)
	r.POST("/login", postLogin)
	r.GET("/login-by-email", getLoginByEmail)
	r.POST("/update-profile", updateProfile)

	// Маршруты для корзины
	r.POST("/api/add-to-cart", addToCartHandler)
	r.GET("/api/cart-count", getCartCountHandler)
	r.GET("/api/cart-items", getCartItemsHandler)
	r.DELETE("/api/cart-items/:tripId", deleteCartItemHandler)
	r.PUT("/api/cart-items/:tripId", updateCartItemHandler)
	r.GET("/api/cart-total", getCartTotalHandler)

	fmt.Println("Сервер запущен на http://localhost:8081")
	r.Run(":8081")
}

// corsMiddleware - мидлвар для обработки CORS
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		c.Next()
	}
}

// getAccounts - получение списка аккаунтов
func getAccounts(c *gin.Context) {
	rows, err := db.Query("SELECT id, login, password FROM accounts")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при получении данных из базы данных", "error": err.Error()})
		return
	}
	defer rows.Close()

	var accounts []Account
	for rows.Next() {
		var acc Account
		if err := rows.Scan(&acc.ID, &acc.Login, &acc.Password); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при обработке данных", "error": err.Error()})
			return
		}
		accounts = append(accounts, acc)
	}

	c.JSON(http.StatusOK, accounts)
}

// postAccount - создание нового аккаунта
func postAccount(c *gin.Context) {
	var input Account
	err := c.BindJSON(&input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных", "error": err.Error()})
		return
	}

	// Хэширование пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка хэширования пароля", "error": err.Error()})
		return
	}
	input.Password = string(hashedPassword)

	// Вставка данных в базу данных
	_, err = db.Exec("INSERT INTO accounts (login, password, email) VALUES ($1, $2, $3)", input.Login, input.Password, input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при сохранении данных", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Аккаунт успешно создан"})
}

// postLogin - авторизация пользователя
func postLogin(c *gin.Context) {
	var input Account
	err := c.BindJSON(&input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных", "error": err.Error()})
		return
	}

	var storedPassword string
	var userId int
	err = db.QueryRow("SELECT id, password FROM accounts WHERE email = $1", input.Login).Scan(&userId, &storedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Логин или пароль неверны"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при получении данных из базы данных", "error": err.Error()})
		return
	}

	// Сравнение введенного пароля с захэшированным
	if err := bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Логин или пароль неверны"})
		return
	}

	// Создаем JWT токен
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"login": input.Login,
		"id":    userId, // Добавляем ID пользователя в токен
		"exp":   time.Now().Add(time.Hour * 1).Unix(),
	})

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при создании токена", "error": err.Error()})
		return
	}

	// Отправляем токен
	response := map[string]string{
		"token": tokenString,
		"login": input.Login,
	}

	c.JSON(http.StatusOK, response)
}

// getLoginByEmail - получение данных аккаунта по email
func getLoginByEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Отсутствует параметр email"})
		return
	}

	var account Account
	err := db.QueryRow("SELECT id, login FROM accounts WHERE email = $1", email).Scan(&account.ID, &account.Login)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"message": "Аккаунт с таким email не найден"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при получении данных из базы данных", "error": err.Error()})
		return
	}

	response := map[string]interface{}{
		"id":    account.ID,
		"login": account.Login,
	}

	c.JSON(http.StatusOK, response)
}

// updateProfile - обновление профиля пользователя
func updateProfile(c *gin.Context) {
	var input Account
	err := c.BindJSON(&input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Неверный формат данных", "error": err.Error()})
		return
	}

	// Проверяем, что ID пользователя передан
	if input.ID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Отсутствует ID пользователя"})
		return
	}

	// Хэширование нового пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка хэширования пароля", "error": err.Error()})
		return
	}
	input.Password = string(hashedPassword)

	// Обновляем данные пользователя по ID
	_, err = db.Exec("UPDATE accounts SET email = $1, login = $2 WHERE id = $3", input.Email, input.Login, input.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка при обновлении профиля", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Профиль успешно обновлен"})
}

// authMiddleware - мидлвар для проверки авторизации
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Отсутствует токен авторизации"})
			return
		}

		// Извлекаем токен из заголовка
		tokenString := authHeader[len("Bearer "):]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Проверяем метод подписи
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("неожиданный метод подписи: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Недействительный токен", "error": err.Error()})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Добавляем информацию о пользователе в контекст
			userID := int(claims["id"].(float64))
			c.Set("userID", userID)
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Недействительный токен"})
			return
		}

		c.Next()
	}
}

// addTripHandler - добавление новой путевки
func addTripHandler(c *gin.Context) {
	// Получаем данные из формы
	title := c.PostForm("tripTitle")
	startDate := c.PostForm("tripStartDate") // Новое поле
	endDate := c.PostForm("tripEndDate")     // Новое поле
	price := c.PostForm("tripPrice")
	description := c.PostForm("tripDescription")

	// Проверка обязательных полей
	if title == "" || startDate == "" || endDate == "" || price == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Название, даты начала и окончания, а также цена путевки обязательны"})
		return
	}

	// Обработка загрузки изображения
	file, err := c.FormFile("image")
	var imagePath string
	if err != nil {
		// Если изображение не загружено, используем изображение по умолчанию
		imagePath = "/uploads/default_image.jpg" // Путь к изображению по умолчанию
	} else {
		// Сохранение изображения на сервере
		imagePath = filepath.Join(uploadDir, file.Filename)
		if err := c.SaveUploadedFile(file, imagePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения изображения: " + err.Error()})
			return
		}
		// Возвращаем URL для загрузки изображения
		imagePath = "/uploads/" + file.Filename
	}

	query := `
		INSERT INTO trips (title, start_date, end_date, price, description, image_path)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = db.Exec(query, title, startDate, endDate, price, description, imagePath)
	if err != nil {
		log.Printf("Ошибка сохранения данных в базе данных: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Ошибка сохранения данных в базе данных: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Путевка успешно добавлена", "image_path": imagePath})
}

// getTripsHandler - получение списка путевок с фильтрацией
func getTripsHandler(c *gin.Context) {
	searchTerm := c.Query("search")       // Параметр для поиска по названию
	checkin := c.Query("checkin")         // Дата заезда
	checkout := c.Query("checkout")       // Дата отъезда
	destination := c.Query("destination") // Место назначения

	var query string
	var args []interface{}
	var argIndex = 1

	query = `SELECT id, title, start_date, end_date, price, description, image_path FROM trips`

	var conditions []string
	if searchTerm != "" {
		conditions = append(conditions, fmt.Sprintf(`title ILIKE $%d`, argIndex))
		args = append(args, "%"+searchTerm+"%")
		argIndex++
	}
	if checkin != "" {
		conditions = append(conditions, fmt.Sprintf(`start_date >= $%d`, argIndex))
		args = append(args, checkin)
		argIndex++
	}
	if checkout != "" {
		conditions = append(conditions, fmt.Sprintf(`end_date <= $%d`, argIndex))
		args = append(args, checkout)
		argIndex++
	}
	if destination != "" {
		conditions = append(conditions, fmt.Sprintf(`title ILIKE $%d`, argIndex))
		args = append(args, "%"+destination+"%")
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка выполнения запроса: " + err.Error()})
		return
	}
	defer rows.Close()

	var trips []gin.H
	for rows.Next() {
		var id int
		var title, startDate, endDate, price, description, imagePath string
		if err := rows.Scan(&id, &title, &startDate, &endDate, &price, &description, &imagePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка чтения данных: " + err.Error()})
			return
		}
		trips = append(trips, gin.H{
			"id":          id,
			"title":       title,
			"startDate":   startDate,
			"endDate":     endDate,
			"price":       price,
			"description": description,
			"imagePath":   imagePath,
		})
	}

	c.JSON(http.StatusOK, trips)
}

// handleDeleteTrip - удаление путевки
func handleDeleteTrip(c *gin.Context) {
	tripID := c.Param("id")

	query := `DELETE FROM trips WHERE id = $1`
	result, err := db.Exec(query, tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при удалении путевки"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при проверке удаления"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Путевка не найдена"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Путевка успешно удалена"})
}

// getTripByIDHandler - получение путевки по ID
func getTripByIDHandler(c *gin.Context) {

	tripID := c.Param("id")

	id, err := strconv.Atoi(tripID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID"})
		return
	}

	query := `SELECT id, title, start_date, end_date, price, description, image_path FROM trips WHERE id = $1`
	row := db.QueryRow(query, id)

	var trip gin.H
	var idDB int
	var title, startDate, endDate, price, description, imagePath string

	err = row.Scan(&idDB, &title, &startDate, &endDate, &price, &description, &imagePath)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Путевка не найдена"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка чтения данных: " + err.Error()})
		}
		return
	}

	// Формируем ответ
	trip = gin.H{
		"id":          idDB,
		"title":       title,
		"startDate":   startDate,
		"endDate":     endDate,
		"price":       price,
		"description": description,
		"imagePath":   imagePath,
	}

	c.JSON(http.StatusOK, trip)
}

// addToCartHandler - добавление путевки в корзину
func addToCartHandler(c *gin.Context) {
	var req struct {
		UserID int `json:"userId"`
		TripID int `json:"tripId"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный запрос"})
		return
	}

	// Проверяем, есть ли уже такая путевка в корзине
	var cartID int
	err := db.QueryRow("SELECT id FROM user_carts WHERE user_id = $1 AND trip_id = $2", req.UserID, req.TripID).Scan(&cartID)
	if err == sql.ErrNoRows {
		// Если путевки нет в корзине, добавляем её
		_, err = db.Exec("INSERT INTO user_carts (user_id, trip_id) VALUES ($1, $2)", req.UserID, req.TripID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка добавления в корзину"})
			return
		}
	} else if err == nil {
		// Если путевка уже есть, увеличиваем количество
		_, err = db.Exec("UPDATE user_carts SET quantity = quantity + 1 WHERE id = $1", cartID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления корзины"})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка базы данных"})
		return
	}

	// Получаем общее количество путевок в корзине
	var cartCount int
	err = db.QueryRow("SELECT SUM(quantity) FROM user_carts WHERE user_id = $1", req.UserID).Scan(&cartCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка подсчета корзины"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"cartCount": cartCount})
}

// getCartCountHandler - получение количества путевок в корзине
func getCartCountHandler(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан ID пользователя"})
		return
	}

	userIDInt, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID пользователя"})
		return
	}

	var cartCount int
	err = db.QueryRow("SELECT COALESCE(SUM(quantity), 0) FROM user_carts WHERE user_id = $1", userIDInt).Scan(&cartCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка подсчета корзины"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"cartCount": cartCount})
}

func getCartItemsHandler(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан ID пользователя"})
		return
	}

	userIDInt, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID пользователя"})
		return
	}

	rows, err := db.Query(`
        SELECT uc.trip_id, t.title, uc.quantity
        FROM user_carts uc
        JOIN trips t ON uc.trip_id = t.id
        WHERE uc.user_id = $1
        ORDER BY uc.id ASC`, userIDInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при загрузке данных о корзине"})
		return
	}
	defer rows.Close()

	var cartItems []map[string]interface{}
	for rows.Next() {
		var tripID int
		var title string
		var quantity int
		if err := rows.Scan(&tripID, &title, &quantity); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при сканировании данных"})
			return
		}
		cartItems = append(cartItems, map[string]interface{}{
			"tripId":   tripID,
			"title":    title,
			"quantity": quantity,
		})
	}

	c.JSON(http.StatusOK, gin.H{"cartItems": cartItems})
}

// deleteCartItemHandler - удаление путевки из корзины
func deleteCartItemHandler(c *gin.Context) {
	tripID := c.Param("tripId")
	userID := c.Query("userId")

	if tripID == "" || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан ID путевки или пользователя"})
		return
	}

	userIDInt, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID пользователя"})
		return
	}

	_, err = db.Exec("DELETE FROM user_carts WHERE user_id = $1 AND trip_id = $2", userIDInt, tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при удалении путевки"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Путевка успешно удалена"})
}

// updateCartItemHandler - редактирование количества путевок
func updateCartItemHandler(c *gin.Context) {
	tripID := c.Param("tripId")
	userID := c.Query("userId")

	var req struct {
		Quantity int `json:"quantity"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный запрос"})
		return
	}

	if tripID == "" || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан ID путевки или пользователя"})
		return
	}

	userIDInt, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID пользователя"})
		return
	}

	_, err = db.Exec("UPDATE user_carts SET quantity = $1 WHERE user_id = $2 AND trip_id = $3", req.Quantity, userIDInt, tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при обновлении количества путевок"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Количество путевок успешно обновлено"})
}

func getCartTotalHandler(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан ID пользователя"})
		return
	}

	userIDInt, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат ID пользователя"})
		return
	}

	var totalSum float64
	err = db.QueryRow(`
        SELECT COALESCE(SUM(uc.quantity * CAST(t.price AS FLOAT)), 0)
        FROM user_carts uc
        JOIN trips t ON uc.trip_id = t.id
        WHERE uc.user_id = $1`, userIDInt).Scan(&totalSum)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при подсчете итоговой суммы"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"totalSum": totalSum})
}
