import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchQuerySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Search API endpoint to generate box score links
  app.post("/api/search", async (req, res) => {
    try {
      const result = searchQuerySchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid search query",
          errors: result.error.flatten().fieldErrors
        });
      }
      
      const searchResult = await storage.generateBoxScoreLinks(result.data);
      res.json(searchResult);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
