import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EmailWriterService {

  private API_URL = "/hf/models/google/flan-t5-small";  // using proxy
  private API_KEY = "";

  async generateEmail(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      });

      const data = await response.json();

      if (data?.error?.includes("Loading")) {
        return "Model is loading, please try again in a few seconds.";
      }

      if (data && data[0] && data[0].generated_text) {
        return data[0].generated_text;
      }

      return "Could not generate email.";
    } catch (err) {
      console.error(err);
      return "Error connecting to AI service.";
    }
  }
}