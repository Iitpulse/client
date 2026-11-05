/*
  "NTA standard" exam template, client copy of api-tests src/m6/nta-standard.ts (the frozen exam app's wording), used
  for the editor's Reset buttons, the live preview's highlights and the sample data. Keep identical to the server.
*/
import type { ExamTools, InstructionsDoc, Lang, WordingKey } from "../m6-contract";

export interface TemplateContent {
  wording: Record<Lang, Record<WordingKey, string>>;
  instructions: Record<Lang, InstructionsDoc>;
  tools: ExamTools;
}
export const WORDING_KEYS: WordingKey[] = ["clear", "saveNext", "saveMarkReview", "markReviewNext", "submit", "notAnswered"];
export const WORDING_MAX = 32;
export const NTA_STANDARD_NAME = "NTA standard";
export const PLACEHOLDERS = ["{test name}", "{duration}", "{questions}", "{marks}", "{negative marks}"] as const;
export const NTA_LABELS: Record<WordingKey, string> = {
  clear: "Clear",
  saveNext: "Save & Next",
  saveMarkReview: "Save & Mark For Review",
  markReviewNext: "Mark For Review & Next",
  submit: "Submit",
  notAnswered: "Not Answered",
};

export const NTA_STANDARD: TemplateContent = {
  wording: { en: { ...NTA_LABELS }, hi: { ...NTA_LABELS } },
  instructions: {
    en: {
      heading: "Please read the instructions carefully",
      blocks: [
        {
          id: "general",
          title: "General Instructions:",
          lines: [
            "Total duration of {test name} is {duration} min.",
            "The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.",
            "The Questions Palette displayed on the right side of screen will show the status of each question using colored indicators.",
          ],
        },
        {
          id: "navigating",
          title: "Navigating to a Question",
          lines: [
            "Click on the question number in the Question Palette to go to that question directly.",
            'Click on "Save & Next" to save your answer for the current question and move to the next question.',
            'Click on "Mark for Review & Next" to save your answer and mark it for review.',
          ],
        },
        {
          id: "answering",
          title: "Answering a Question",
          lines: [
            "To select your answer, click on the button of one of the options.",
            'To deselect your chosen answer, click on the "Clear Response" button.',
            "To change your answer, click on another option.",
            'You MUST click on "Save & Next" to save your answer.',
          ],
        },
        {
          id: "sections",
          title: "Navigation through sections",
          lines: ["Sections are displayed on the top bar. Click on a section name to view its questions.", "You can shuffle between sections and questions anytime during the examination."],
        },
      ],
      declaration:
        "I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of any prohibited gadget like mobile phone, bluetooth devices etc.",
    },
    hi: {
      heading: "कृपया निर्देशों को ध्यान से पढ़ें",
      blocks: [
        {
          id: "general",
          title: "सामान्य निर्देश:",
          lines: [
            "{test name} की कुल अवधि {duration} मिनट है।",
            "सर्वर पर घड़ी लगाई गई है तथा आपकी स्क्रीन के दाहिने कोने में शीर्ष पर काउंटडाउन टाइमर में आपके लिए परीक्षा समाप्त करने के लिए शेष समय प्रदर्शित होगा।",
            "स्क्रीन के दाहिने कोने पर प्रश्न पैलेट, प्रत्येक प्रश्न के लिए रंगीन संकेतकों का उपयोग करके स्थिति दिखाता है।",
          ],
        },
        {
          id: "navigating",
          title: "प्रश्न पर जाना",
          lines: [
            "प्रश्न पैलेट में प्रश्न संख्या पर क्लिक करके सीधे उस प्रश्न पर जाएं।",
            '"Save & Next" पर क्लिक करके वर्तमान प्रश्न का उत्तर सुरक्षित करें और अगले प्रश्न पर जाएं।',
            '"Mark for Review & Next" पर क्लिक करके उत्तर सुरक्षित करें और पुनर्विचार के लिए चिह्नित करें।',
          ],
        },
        {
          id: "answering",
          title: "प्रश्न का उत्तर देना",
          lines: [
            "अपना उत्तर चुनने के लिए, विकल्प के बटन पर क्लिक करें।",
            'चयनित उत्तर को हटाने के लिए "Clear Response" बटन पर क्लिक करें।',
            "उत्तर बदलने के लिए, दूसरे विकल्प पर क्लिक करें।",
            'उत्तर सुरक्षित करने के लिए "Save & Next" पर क्लिक करना आवश्यक है।',
          ],
        },
        {
          id: "sections",
          title: "अनुभागों में नेविगेट करना",
          lines: ["अनुभाग शीर्ष बार पर प्रदर्शित हैं। प्रश्न देखने के लिए अनुभाग नाम पर क्लिक करें।", "परीक्षा के दौरान आप किसी भी समय अनुभागों और प्रश्नों के बीच आ-जा सकते हैं।"],
        },
      ],
      declaration: "मैंने उपरोक्त सभी निर्देशों को पढ़ और समझ लिया है। मेरे लिए आवंटित सभी कंप्यूटर हार्डवेयर उचित काम करने की स्थिति में हैं।",
    },
  },
  tools: { calculator: "off", markForReview: true, viewQuestionPaper: true, viewInstructions: true, languageSwitch: true, roughSheet: false },
};

export const cloneContent = (c: TemplateContent): TemplateContent => JSON.parse(JSON.stringify(c));

/** "2 labels changed · shorter instructions" (same as the server's summary). */
export function summaryOf(c: TemplateContent): string {
  const parts: string[] = [];
  const changed = WORDING_KEYS.filter((k) => c.wording.en?.[k] !== NTA_STANDARD.wording.en[k] || c.wording.hi?.[k] !== NTA_STANDARD.wording.hi[k]).length;
  if (changed) parts.push(`${changed} label${changed === 1 ? "" : "s"} changed`);
  const len = (d: InstructionsDoc | undefined) => (d ? d.blocks.reduce((a, b) => a + b.lines.join(" ").length, 0) : 0);
  const mine = len(c.instructions.en);
  const std = len(NTA_STANDARD.instructions.en);
  if (JSON.stringify(c.instructions) !== JSON.stringify(NTA_STANDARD.instructions)) parts.push(mine < std ? "shorter instructions" : mine > std ? "longer instructions" : "instructions changed");
  if (c.tools.calculator !== "off") parts.push(`calculator: ${c.tools.calculator}`);
  if (c.tools.roughSheet) parts.push("rough sheet");
  const off = (["markForReview", "viewQuestionPaper", "viewInstructions", "languageSwitch"] as const).filter((k) => !c.tools[k]);
  if (off.length) parts.push(`${off.length} tool${off.length === 1 ? "" : "s"} off`);
  return parts.length ? parts.join(" · ") : "Same as NTA standard";
}

export interface TestFacts {
  name: string;
  durationMinutes: number;
  questions: number;
  marks: number;
  negativeMarks: string;
}
export function fillPlaceholders(text: string, f: TestFacts): string {
  return text
    .replaceAll("{test name}", f.name)
    .replaceAll("{duration}", String(f.durationMinutes))
    .replaceAll("{questions}", String(f.questions))
    .replaceAll("{marks}", String(f.marks))
    .replaceAll("{negative marks}", f.negativeMarks);
}
