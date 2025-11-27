import { createSafeActionClient } from "next-safe-action";
import * as z from "zod";
import { formSchema, ActionResponse } from "@/lib/form-schema";

const action = createSafeActionClient();

export const serverAction = action
  .schema(formSchema)
  .action(
    async ({
      parsedInput: { name, email, company, employees, message, agree },
    }): Promise<ActionResponse> => {
      // In a real application, you would process the form data here,
      // e.g., save to a database, send an email, etc.
      console.log("Form submitted with data:", {
        name,
        email,
        company,
        employees,
        message,
        agree,
      });

      return {
        success: true,
        message: "Form submitted successfully!",
      };
    }
  );
