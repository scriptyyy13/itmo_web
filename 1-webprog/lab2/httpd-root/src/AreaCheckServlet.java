import com.fastcgi.FCGIInterface;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class AreaCheckServlet {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");
    private static final Double[] RANGE_X = {-5.0, 3.0};
    private static final Double[] RANGE_Y = {-2.0, 2.0};
    private static final Double[] RANGE_R = {1.0, 5.0};

    // коллекция точек
    private static final Map<String, List<String>> sessionStore = new ConcurrentHashMap<>();

    public static void main(String[] args) {
        FCGIInterface fcgiInterface = new FCGIInterface();

        while (fcgiInterface.FCGIaccept() >= 0) {
            long startTime = System.nanoTime();

            try {
                Properties params = FCGIInterface.request.params;
                String queryString = params.getProperty("QUERY_STRING");

                if (queryString == null || queryString.isEmpty()) {
                    sendJsonError("Параметры отсутствуют");
                    continue;
                }

                Map<String, List<String>> queryParams = parseQueryString(queryString);

                // разделяем запросы по экшенам
                String action = getQueryParam(queryParams, "action");

                if (action == null) {
                    handleAreaCheck(queryParams, startTime);
                } else {
                    switch (action) {
                        case "getPointOnServer" -> handleServerUnixTime(queryParams);
                        case "clear"            -> handleClearUserPoints(queryParams);
                        default                 -> handleAreaCheck(queryParams, startTime);
                    }
                }

            } catch (NumberFormatException e) {
                sendJsonError("Некорректный числовой формат");
            } catch (Exception e) {
                sendJsonError("Ошибка сервера: " + e.getMessage());
            }
        }
    }

    // обработка запроса системного времени + выдача всех точек
    private static void handleServerUnixTime(Map<String, List<String>> queryParams) {
        long currentUnixTime = System.currentTimeMillis();
        String allPointsJson = getAllPointsJson();

        String json = String.format(
            "{\"status\":\"ok\",\"serverUnixTime\":%d,\"otherPoints\":%s}",
            currentUnixTime, allPointsJson
        );
        sendJsonResponse(200, json);
    }

    // очистка точек конкретного пользователя
    private static void handleClearUserPoints(Map<String, List<String>> queryParams) {
        String userId = getQueryParam(queryParams, "userId");
        if (userId != null && !userId.isEmpty()) {
            sessionStore.remove(userId);
        }
        sendJsonResponse(200, "{\"status\":\"ok\"}");
    }

    // обработка запроса на попадание
    private static void handleAreaCheck(Map<String, List<String>> queryParams, long startTime) {
        String userId = getQueryParam(queryParams, "userId");
        List<String> xVals = queryParams.get("x");
        List<String> yVals = queryParams.get("y");
        List<String> rVals = queryParams.get("r");

        if (userId == null || userId.isEmpty()) {
            sendJsonError("Не передан userId пользователя");
            return;
        }

        if (xVals == null || yVals == null || rVals == null || xVals.isEmpty() || yVals.isEmpty() || rVals.isEmpty()) {
            sendJsonError("Не переданы все параметры (x, y, r)");
            return;
        }

        double x = Double.parseDouble(xVals.get(0).replace(',', '.'));
        double r = Double.parseDouble(rVals.get(0).replace(',', '.'));

        if (!isValidX(x)) {
            sendJsonError(String.format("X выходит за границы [%.2f; %.2f]", RANGE_X[0], RANGE_X[1]));
            return;
        }
        if (!isValidR(r)) {
            sendJsonError(String.format("R выходит за границы [%.2f; %.2f]", RANGE_R[0], RANGE_R[1]));
            return;
        }

        List<String> resultsJson = new ArrayList<>();
        List<String> userPointsList = sessionStore.computeIfAbsent(userId, k -> Collections.synchronizedList(new ArrayList<>()));

        for (String yStr : yVals) {
            double y = Double.parseDouble(yStr.replace(',', '.'));

            if (!isValidY(y)) {
                continue;
            }

            boolean hit = checkHit(x, y, r);
            long executionTime = (System.nanoTime() - startTime) / 1000;
            String currentTime = LocalDateTime.now().format(DATE_FORMATTER);

            String jsonItem = String.format(Locale.US,
                "{\"userId\":\"%s\",\"x\":%.2f,\"y\":%.2f,\"r\":%.2f,\"hit\":%b,\"currentTime\":\"%s\",\"executionTime\":%d}",
                userId, x, y, r, hit, currentTime, executionTime
            );

            resultsJson.add(jsonItem);
            userPointsList.add(jsonItem);
        }

        String jsonResponse = "[" + String.join(",", resultsJson) + "]";
        sendJsonResponse(200, jsonResponse);
    }

    // получение всех сохраненных точек
    private static String getAllPointsJson() {
        List<String> allItems = new ArrayList<>();
        
        for (List<String> userList : sessionStore.values()) {
            synchronized (userList) {
                allItems.addAll(userList);
            }
        }

        return "[" + String.join(",", allItems) + "]";
    }

    // получение одиночного параметра из мапы
    private static String getQueryParam(Map<String, List<String>> params, String key) {
        List<String> vals = params.get(key);
        return (vals != null && !vals.isEmpty()) ? vals.get(0) : null;
    }

    // различная математическая валидация
    private static boolean isValidX(double x) {
        return x >= RANGE_X[0] && x <= RANGE_X[1];
    }

    private static boolean isValidY(double y) {
        return y >= RANGE_Y[0] && y <= RANGE_Y[1];
    }

    private static boolean isValidR(double r) {
        return r >= RANGE_R[0] && r <= RANGE_R[1];
    }

    // попадание в область
    private static boolean checkHit(double x, double y, double r) {
        if (x >= 0 && y >= 0) {
            return (x * x + y * y) <= (r / 2.0) * (r / 2.0);
        }
        if (x <= 0 && y <= 0) {
            return y >= (-x - r);
        }
        if (x >= 0 && y <= 0) {
            return x <= (r / 2.0) && y >= -r;
        }
        return false;
    }

    // парсинг query string
    private static Map<String, List<String>> parseQueryString(String query) {
        Map<String, List<String>> map = new HashMap<>();
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = pair.substring(0, idx);
                String value = pair.substring(idx + 1);
                map.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
            }
        }
        return map;
    }

    // отправка json
    private static void sendJsonResponse(int statusCode, String jsonBody) {
        byte[] bytes = jsonBody.getBytes(StandardCharsets.UTF_8);
        
        String response = String.format(
            "HTTP/1.1 %d OK\r\n" +
            "Content-Type: application/json; charset=utf-8\r\n" +
            "Content-Length: %d\r\n" +
            "Connection: close\r\n\r\n" +
            "%s",
            statusCode, bytes.length, jsonBody
        );

        System.out.print(response);
        System.out.flush();
    }

    // ошибка json
    private static void sendJsonError(String errorMessage) {
        String jsonError = String.format("{\"error\":\"%s\"}", errorMessage);
        sendJsonResponse(400, jsonError);
    }
}