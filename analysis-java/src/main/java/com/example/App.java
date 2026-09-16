package com.example;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ParseProblemException;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.expr.*;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/**
 * Java Analysis Microservice
 * 
 * NOTE: This service's only responsibility is producing an IR in the schema shared
 * with the Python service. All comparison, fingerprinting, and contradiction-detection
 * logic lives in the Python service or the shared comparator in the Node backend, not here.
 */
public class App {
    public static void main(String[] args) throws IOException {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        
        server.createContext("/health", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("GET".equals(exchange.getRequestMethod())) {
                    String response = "{\"status\": \"ok\", \"service\": \"analysis-java\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, response.getBytes().length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(response.getBytes());
                    os.close();
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });

        server.createContext("/parse", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                if ("POST".equals(exchange.getRequestMethod())) {
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    
                    try {
                        InputStream is = exchange.getRequestBody();
                        String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                        JSONObject req = new JSONObject(body);
                        String code = req.optString("code", "");

                        CompilationUnit cu = null;
                        try {
                            cu = StaticJavaParser.parse(code);
                        } catch (ParseProblemException e) {
                            try {
                                String wrapped = "class Wrapper { " + code + " }";
                                cu = StaticJavaParser.parse(wrapped);
                            } catch (ParseProblemException ex) {
                                JSONObject err = new JSONObject();
                                err.put("error", "Could not parse Java code: " + ex.getMessage());
                                String errStr = err.toString();
                                exchange.sendResponseHeaders(422, errStr.getBytes().length);
                                OutputStream os = exchange.getResponseBody();
                                os.write(errStr.getBytes());
                                os.close();
                                return;
                            }
                        }

                        JSONObject ir = new JSONObject();
                        ir.put("language", "java");
                        JSONArray functions = new JSONArray();

                        cu.findAll(MethodDeclaration.class).forEach(method -> {
                            JSONObject funcObj = new JSONObject();
                            funcObj.put("name", method.getNameAsString());
                            JSONArray funcBody = new JSONArray();
                            
                            method.getBody().ifPresent(blockStmt -> {
                                for (Statement stmt : blockStmt.getStatements()) {
                                    JSONObject parsedStmt = parseStatement(stmt);
                                    if (parsedStmt != null) {
                                        funcBody.put(parsedStmt);
                                    }
                                }
                            });
                            
                            funcObj.put("body", funcBody);
                            functions.put(funcObj);
                        });

                        ir.put("functions", functions);
                        String response = ir.toString();
                        exchange.sendResponseHeaders(200, response.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(response.getBytes());
                        os.close();

                    } catch (Exception e) {
                        e.printStackTrace();
                        JSONObject err = new JSONObject();
                        err.put("error", "Internal server error: " + e.getMessage());
                        String errStr = err.toString();
                        exchange.sendResponseHeaders(500, errStr.getBytes().length);
                        OutputStream os = exchange.getResponseBody();
                        os.write(errStr.getBytes());
                        os.close();
                    }
                } else {
                    exchange.sendResponseHeaders(405, -1);
                }
            }
        });
        
        server.setExecutor(null); 
        server.start();
        System.out.println("Java service listening on port " + port);
    }
    
    private static JSONArray parseBlock(BlockStmt block) {
        JSONArray arr = new JSONArray();
        if (block != null) {
            for (Statement stmt : block.getStatements()) {
                JSONObject obj = parseStatement(stmt);
                if (obj != null) {
                    arr.put(obj);
                }
            }
        }
        return arr;
    }
    
    private static JSONArray parseStatementOrBlock(Statement stmt) {
        if (stmt == null) return new JSONArray();
        if (stmt.isBlockStmt()) {
            return parseBlock(stmt.asBlockStmt());
        }
        JSONArray arr = new JSONArray();
        JSONObject obj = parseStatement(stmt);
        if (obj != null) {
            arr.put(obj);
        }
        return arr;
    }

    private static JSONObject parseStatement(Statement stmt) {
        if (stmt.isForStmt()) {
            ForStmt fs = stmt.asForStmt();
            JSONObject obj = new JSONObject();
            obj.put("type", "loop");
            obj.put("kind", "for");
            String cond = fs.getCompare().map(e -> e.toString()).orElse("");
            obj.put("condition", cond);
            obj.put("body", parseStatementOrBlock(fs.getBody()));
            return obj;
        } else if (stmt.isWhileStmt()) {
            WhileStmt ws = stmt.asWhileStmt();
            JSONObject obj = new JSONObject();
            obj.put("type", "loop");
            obj.put("kind", "while");
            obj.put("condition", ws.getCondition().toString());
            obj.put("body", parseStatementOrBlock(ws.getBody()));
            return obj;
        } else if (stmt.isIfStmt()) {
            IfStmt is = stmt.asIfStmt();
            JSONObject obj = new JSONObject();
            obj.put("type", "condition");
            obj.put("expr", is.getCondition().toString());
            obj.put("then", parseStatementOrBlock(is.getThenStmt()));
            if (is.getElseStmt().isPresent()) {
                obj.put("else", parseStatementOrBlock(is.getElseStmt().get()));
            } else {
                obj.put("else", new JSONArray());
            }
            return obj;
        } else if (stmt.isExpressionStmt()) {
            Expression expr = stmt.asExpressionStmt().getExpression();
            if (expr.isAssignExpr()) {
                AssignExpr ae = expr.asAssignExpr();
                JSONObject obj = new JSONObject();
                obj.put("type", "assign");
                obj.put("target", ae.getTarget().toString());
                obj.put("value", ae.getValue().toString());
                return obj;
            } else if (expr.isMethodCallExpr()) {
                MethodCallExpr mc = expr.asMethodCallExpr();
                JSONObject obj = new JSONObject();
                obj.put("type", "call");
                obj.put("name", mc.getNameAsString());
                JSONArray args = new JSONArray();
                for (Expression arg : mc.getArguments()) {
                    args.put(arg.toString());
                }
                obj.put("args", args);
                return obj;
            }
        } else if (stmt.isReturnStmt()) {
            ReturnStmt rs = stmt.asReturnStmt();
            JSONObject obj = new JSONObject();
            obj.put("type", "return");
            String val = rs.getExpression().map(e -> e.toString()).orElse("");
            obj.put("value", val);
            return obj;
        }
        return null;
    }
}
