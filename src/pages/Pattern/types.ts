import { z } from "zod";

export const PatternFormSchema = z.object({
  name: z.string().nonempty("Fill in Name"),
  exam: z.string().nonempty("Fill in Exam"),
  durationInMinutes: z.string().nonempty("Fill in Duration"),
  sections: z.array(
    z.object({
      id: z.string().nonempty("Fill in section Id"),
      name: z.string().nonempty("Fill in section Name"),
      exam: z.string().nonempty("Fill in Exam"),
      subject: z.string().nonempty("Fill in section Subject"),
      subSections: z.array(
        z.object({
          id: z.string().nonempty("Fill in subsection Id"),
          name: z.string().nonempty("Fill in subsection Name"),
          description: z.string().nonempty("Fill in subsection Description"),
          type: z.string().nonempty("Fill in subsection Type"),
          totalQuestions: z.number(),
          toBeAttempted: z.number(),
          markingScheme: z.object({
            correct: z.array(z.number()),
            incorrect: z.number(),
          }),
        })
      ),
      totalQuestions: z.number(),
      toBeAttempted: z.number(),
    })
  ),
});

export type PatternFormSchemaType = z.infer<typeof PatternFormSchema>;
/*
{
    "pattern": {
        "_id": "IITP_PATTERNTEST",
        "name": "Pattern test",
        "exam": "JEE MAINS",
        "durationInMinutes": 200,
        "sections": [
            {
                "id": "98.0170228892973",
                "name": "physics",
                "exam": "JEE MAINS",
                "subject": "physics",
                "subSections": [
                    {
                        "id": "92.57861821892189",
                        "name": "chap1",
                        "description": "asd",
                        "type": "single",
                        "totalQuestions": 100,
                        "toBeAttempted": 10,
                        "markingScheme": {
                            "correct": 1,
                            "incorrect": 0
                        }
                    },
                    {
                        "id": "13.973119303655835",
                        "name": "chap2",
                        "description": "asd",
                        "type": "single",
                        "totalQuestions": 100,
                        "toBeAttempted": 10,
                        "markingScheme": {
                            "correct": 1,
                            "incorrect": 0
                        }
                    }
                ],
                "totalQuestions": 200,
                "toBeAttempted": 20
            },
            {
                "id": "34.421844354786344",
                "name": "sec",
                "exam": "JEE MAINS",
                "subject": "physics",
                "subSections": [
                    {
                        "id": "10.8873035765092",
                        "name": "scja",
                        "description": "sd",
                        "type": "single",
                        "totalQuestions": 1,
                        "toBeAttempted": 1,
                        "markingScheme": {
                            "correct": 1,
                            "incorrect": 0
                        }
                    }
                ],
                "totalQuestions": 1,
                "toBeAttempted": 1
            }
        ],
        "createdAt": "2023-06-30T11:54:20.563Z",
        "modifiedAt": "2023-06-30T11:54:20.563Z",
        "createdBy": {
            "userType": "admin",
            "id": "IITP_ST_3811d4ad_1fd4_465a_b198_115c345cf28a"
        },
        "usedIn": []
    }
}
*/
