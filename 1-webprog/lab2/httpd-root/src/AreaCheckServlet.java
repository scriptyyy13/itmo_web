import com.fastcgi.FCGIInterface;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class AreaCheckServlet {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");
    
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

                // разделяем запросы
                if (queryParams.containsKey("action") && "getServerUnixTime".equals(queryParams.get("action").get(0))) {
                    handleServerUnixTime();
                } else {
                    handleAreaCheck(queryParams, startTime);
                }

            } catch (NumberFormatException e) {
                sendJsonError("Некорректный числовой формат");
            } catch (Exception e) {
                sendJsonError("Ошибка сервера: " + e.getMessage());
            }
        }
    }

    // обработка запроса системного времени
    private static void handleServerUnixTime() {
        long currentUnixTime = System.currentTimeMillis();
        String json = String.format("{\"status\":\"ok\",\"serverUnixTime\":%d}", currentUnixTime);
        sendJsonResponse(200, json);
    }

    // обработка запроса на попадание
    private static void handleAreaCheck(Map<String, List<String>> queryParams, long startTime) {
        List<String> xVals = queryParams.get("x");
        List<String> yVals = queryParams.get("y");
        List<String> rVals = queryParams.get("r");

        if (xVals == null || yVals == null || rVals == null || xVals.isEmpty() || yVals.isEmpty() || rVals.isEmpty()) {
            sendJsonError("Не переданы все параметры (x, y, r)");
            return;
        }

        double x = Double.parseDouble(xVals.get(0).replace(',', '.'));
        double r = Double.parseDouble(rVals.get(0).replace(',', '.'));

        if (!isValidX(x)) {
            sendJsonError("X выходит за границы [-5; 3]");
            return;
        }
        if (!isValidR(r)) {
            sendJsonError("R выходит за границы [1; 5]");
            return;
        }

        List<String> resultsJson = new ArrayList<>();

        for (String yStr : yVals) {
            double y = Double.parseDouble(yStr.replace(',', '.'));

            if (!isValidY(y)) {
                continue;
            }

            boolean hit = checkHit(x, y, r);
            long executionTime = (System.nanoTime() - startTime) / 1000;
            String currentTime = LocalDateTime.now().format(DATE_FORMATTER);

            String jsonItem = String.format(Locale.US,
                "{\"x\":%.2f,\"y\":%.2f,\"r\":%.2f,\"hit\":%b,\"currentTime\":\"%s\",\"executionTime\":%d}",
                x, y, r, hit, currentTime, executionTime
            );
            resultsJson.add(jsonItem);
        }

        String jsonResponse = "[" + String.join(",", resultsJson) + "]";
        sendJsonResponse(200, jsonResponse);
    }

    // различная математическая валидация
    private static boolean isValidX(double x) {
        return x >= -5.0 && x <= 3.0;
    }

    private static boolean isValidY(double y) {
        return y >= -2.0 && y <= 2.0;
    }

    private static boolean isValidR(double r) {
        return r >= 1.0 && r <= 5.0;
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