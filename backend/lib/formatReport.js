async function formatReport(reportData) {
    const apiKey = process.env.GEMINI_API_KEY;

    try {
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set.");
        }

        const systemInstruction = "You are formatting a pre-computed code analysis result into a clear, readable report for a college assignment review tool. You must NOT invent new findings, scores, or conclusions beyond what is given to you in the data \u2014 only phrase, organize, and explain the data provided. Structure your response into exactly these four sections with these exact headers: 'Summary', 'Similarity Evidence', 'Logic Issues', 'Recommendation'. If fingerprintMatch is set, explicitly state in the Summary that high similarity is expected because both submissions implement the well-known algorithm named in fingerprintMatch, and do NOT recommend flagging based on structural similarity alone in that case \u2014 the Recommendation should note it's likely not plagiarism and should still mention if contradictions exist separately. If the input language is 'java' and contradictions is empty, mention briefly in Logic Issues that automated contradiction-checking is currently only implemented for Python submissions, so an empty result doesn't guarantee correctness. If partial is true, add a note at the end of the Summary that this analysis is partial because one of the analysis services was unavailable during processing.";

        const promptData = JSON.stringify(reportData);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [{
                    role: "user",
                    parts: [{ text: promptData }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Unexpected response structure from Gemini API");
        }

    } catch (err) {
        console.error("[formatReport] Error calling Gemini API, falling back to template:", err);
        return generateFallbackReport(reportData);
    }
}

function generateFallbackReport(data) {
    let report = "Summary\n=======\n";
    report += `Similarity Score: ${data.similarityScore}%\n`;
    
    if (data.fingerprintMatch) {
        report += `High similarity is expected because both submissions implement the well-known algorithm: ${data.fingerprintMatch}.\n`;
    }
    if (data.partial) {
        report += `Note: This analysis is partial because one of the analysis services was unavailable during processing.\n`;
    }

    report += "\nSimilarity Evidence\n===================\n";
    if (data.structuralEvidence && data.structuralEvidence.length > 0) {
        report += data.structuralEvidence.join("\n") + "\n";
    } else {
        report += "No significant structural evidence.\n";
    }

    report += "\nLogic Issues\n============\n";
    if (data.contradictions && data.contradictions.length > 0) {
        report += JSON.stringify(data.contradictions, null, 2) + "\n";
    } else {
        report += "No logic contradictions found.\n";
    }
    if (data.language === 'java' && (!data.contradictions || data.contradictions.length === 0)) {
        report += "Note: Automated contradiction-checking is currently only implemented for Python submissions, so an empty result doesn't guarantee correctness.\n";
    }

    report += "\nRecommendation\n==============\n";
    if (data.fingerprintMatch) {
        report += "Likely not plagiarism due to standard algorithm usage. Check logic issues separately.\n";
    } else if (data.similarityScore > 75) {
        report += "High structural similarity detected. Manual review recommended.\n";
    } else {
        report += "No immediate signs of structural plagiarism.\n";
    }

    return report;
}

module.exports = { formatReport };
