const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const Submission = require('../models/Submission');
const Report = require('../models/Report');
const { runAnalysis } = require('../services/analysis');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plagiarism';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        console.log('Clearing old seed data...');
        await User.deleteMany({ clerkUserId: { $in: ['seed-tutor-1', 'seed-student-1', 'seed-student-2', 'seed-student-3'] } });
        await Assessment.deleteMany({ createdBy: 'seed-tutor-1' });
        await Submission.deleteMany({ studentId: { $in: ['seed-student-1', 'seed-student-2', 'seed-student-3'] } });

        console.log('Creating users...');
        const tutor = await User.create({ clerkUserId: 'seed-tutor-1', email: 'tutor@seed.com', name: 'Seed Tutor', role: 'tutor' });
        const student1 = await User.create({ clerkUserId: 'seed-student-1', email: 'student1@seed.com', name: 'Seed Student 1', role: 'student' });
        const student2 = await User.create({ clerkUserId: 'seed-student-2', email: 'student2@seed.com', name: 'Seed Student 2', role: 'student' });
        const student3 = await User.create({ clerkUserId: 'seed-student-3', email: 'student3@seed.com', name: 'Seed Student 3', role: 'student' });

        console.log('Creating assessment...');
        const assessment = await Assessment.create({
            title: 'Implement Binary Search',
            description: 'Write a correct binary search algorithm.',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            allowedLanguages: ['java', 'python'],
            createdBy: tutor.clerkUserId
        });

        console.log('Creating submissions...');
        
        // a. student 1, java — a correct binary search implementation
        const sub1Code = `
class BinarySearch {
    int search(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }
}`;

        // b. student 2, python — a correct binary search implementation using the same mid = (low + high) // 2
        const sub2Code = `
def search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`;

        // c. student 3, python — deliberate contradiction
        // Note clearly: Since contradiction-check is currently Python-only (per Prompt 6/7),
        // submission (c) needs to be written in Python for this seed to demonstrate the feature.
        const sub3Code = `
def check_eligibility(age):
    eligible = False
    if age >= 18:
        eligible = True
    if age >= 18:
        eligible = False
    return eligible
`;

        const sub1 = await Submission.create({ assessmentId: assessment._id, studentId: student1.clerkUserId, language: 'java', code: sub1Code, status: 'submitted' });
        const sub2 = await Submission.create({ assessmentId: assessment._id, studentId: student2.clerkUserId, language: 'python', code: sub2Code, status: 'submitted' });
        const sub3 = await Submission.create({ assessmentId: assessment._id, studentId: student3.clerkUserId, language: 'python', code: sub3Code, status: 'submitted' });

        console.log('Starting mock analysis services...');
        const express = require('express');
        const mockApp = express();
        mockApp.use(express.json());

        // Java IR for Binary Search
        const javaIR = {
            language: "java",
            functions: [{
                name: "search",
                body: [
                    { type: "assign", target: "low", value: "0" },
                    { type: "assign", target: "high", value: "arr.length - 1" },
                    {
                        type: "loop", kind: "while", condition: "low <= high",
                        body: [
                            { type: "assign", target: "mid", value: "(low + high) / 2" },
                            {
                                type: "condition", expr: "arr[mid] == target",
                                then: [{ type: "return", value: "mid" }],
                                else: [{
                                    type: "condition", expr: "arr[mid] < target",
                                    then: [{ type: "assign", target: "low", value: "mid + 1" }],
                                    else: [{ type: "assign", target: "high", value: "mid - 1" }]
                                }]
                            }
                        ]
                    },
                    { type: "return", value: "-1" }
                ]
            }]
        };

        // Python IR for Binary Search
        const pythonIR = {
            language: "python",
            functions: [{
                name: "search",
                body: [
                    { type: "assign", target: "low", value: "0" },
                    { type: "assign", target: "high", value: "len(arr) - 1" },
                    {
                        type: "loop", kind: "while", condition: "low <= high",
                        body: [
                            { type: "assign", target: "mid", value: "(low + high) // 2" },
                            {
                                type: "condition", expr: "arr[mid] == target",
                                then: [{ type: "return", value: "mid" }],
                                else: [{
                                    type: "condition", expr: "arr[mid] < target",
                                    then: [{ type: "assign", target: "low", value: "mid + 1" }],
                                    else: [{ type: "assign", target: "high", value: "mid - 1" }]
                                }]
                            }
                        ]
                    },
                    { type: "return", value: "-1" }
                ]
            }]
        };

        mockApp.post('/parse', (req, res) => {
            const code = req.body.code;
            if (code.includes('check_eligibility')) {
                return res.json({ language: "python", functions: [{ name: "check_eligibility", body: [] }] });
            }
            if (code.includes('int search')) return res.json(javaIR);
            return res.json(pythonIR);
        });

        mockApp.post('/compare', (req, res) => {
            res.json({ similarityScore: 90, evidence: ["Mocked similar"] });
        });

        mockApp.post('/fingerprint-check', (req, res) => {
            const codeIR = req.body.ir;
            if (codeIR.functions[0].name === 'search') {
                return res.json({ match: 'binary_search', confidence: 95 });
            }
            res.json({ match: null });
        });

        mockApp.post('/contradiction-check', (req, res) => {
            const codeIR = req.body.ir;
            if (codeIR.functions[0].name === 'check_eligibility') {
                return res.json({
                    contradictions: [{
                        type: "conflicting_condition",
                        description: "Variable 'eligible' is assigned True when 'age >= 18', but assigned False when 'age >= 18'. These conditions overlap.",
                        lineRef: [4, 6]
                    }]
                });
            }
            res.json({ contradictions: [] });
        });

        const pythonServer = mockApp.listen(8000);
        const javaServer = mockApp.listen(8080); // Express handles both ports here! Wait, same app on multiple ports
        
        console.log('Running analysis pipeline manually...');
        await runAnalysis(sub1._id);
        console.log(`Analysis complete for student 1 (Java)`);
        
        await runAnalysis(sub2._id);
        console.log(`Analysis complete for student 2 (Python)`);
        
        await runAnalysis(sub3._id);
        console.log(`Analysis complete for student 3 (Python, Contradiction)`);

        console.log('Seeding and analysis complete!');
        pythonServer.close();
        javaServer.close();
        process.exit(0);

    } catch (err) {
        console.error('Seed script failed:', err);
        process.exit(1);
    }
}

seed();
