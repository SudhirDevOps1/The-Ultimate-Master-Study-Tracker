import type { StudySession, Subject } from "@/types/models";

export function createMockSubjects(): Subject[] {
  return [
    {
      "id": "17ad7fb6-ad6b-4bce-91ac-a6ce32c109dc",
      "name": "Sigma 9.0 - DSA & Web Development",
      "color": "#2196F3",
      "createdAt": "2026-03-07T07:40:26.319Z"
    },
    {
      "id": "271078f7-ad20-4f28-8312-6569b486d2dc",
      "name": "Exam Preparation",
      "color": "#F44336",
      "createdAt": "2026-03-07T07:41:33.392Z"
    },
    {
      "id": "6e8c81e4-3a21-4b96-b2c9-ad36a27f35f6",
      "name": "Daily Revision",
      "color": "#4CAF50",
      "createdAt": "2026-03-07T07:42:30.934Z"
    },
    {
      "id": "95133b2a-3ebc-450a-9013-bd21807beba7",
      "name": "Planning Next Day",
      "color": "#FFD600",
      "createdAt": "2026-03-07T07:42:59.664Z"
    },
    {
      "id": "c231de4e-f8f9-4357-a2d8-5c1b6a25b5a8",
      "name": "English Language",
      "color": "#00BCD4",
      "createdAt": "2026-03-07T07:41:50.829Z"
    },
    {
      "id": "c5d5a5aa-09ba-4217-b472-4dbd44006563",
      "name": "Lunch Break",
      "color": "#FF9800",
      "createdAt": "2026-03-07T07:41:18.194Z"
    },
    {
      "id": "c76b81e7-3b96-415c-ac19-3a578e54ab3d",
      "name": "AI / ML Study",
      "color": "#9C27B0",
      "createdAt": "2026-03-07T07:42:12.751Z"
    },
    {
      "id": "dbc40f2c-f082-494b-bd1b-bafb252bc486",
      "name": "Go to Room & Eat Dinner",
      "color": "#E91E63",
      "createdAt": "2026-03-07T07:50:13.122Z"
    },
    {
      "id": "e55dc1fd-51f9-4fe8-ad04-8efd3e400e0a",
      "name": "Sigma 9.0 - Handwritten Notes",
      "color": "#FF5722",
      "createdAt": "2026-03-07T07:41:01.953Z"
    }
  ];
}

export function createMockSessions(): StudySession[] {
  return [
    {
      "id": "b8c9d0e1-f2a3-4456-c789-d0e1f2a3b4c5",
      "subjectId": "dbc40f2c-f082-494b-bd1b-bafb252bc486",
      "startTime": "2026-03-15T15:30:00.000Z",
      "endTime": "2026-03-15T16:30:00.000Z",
      "plannedMinutes": 60,
      "actualSeconds": 0,
      "colorTag": "#E91E63",
      "notes": "Wind down for the day — go back to room, have dinner and rest",
      "tags": [
        "focus"
      ],
      "status": "planned",
      "createdAt": "2026-03-15T05:16:08.000Z",
      "updatedAt": "2026-03-15T05:16:08.000Z",
      "manualEntry": false
    },
    {
      "id": "a7b8c9d0-e1f2-4345-b678-c9d0e1f2a3b4",
      "subjectId": "95133b2a-3ebc-450a-9013-bd21807beba7",
      "startTime": "2026-03-15T14:30:00.000Z",
      "endTime": "2026-03-15T15:30:00.000Z",
      "plannedMinutes": 60,
      "actualSeconds": 0,
      "colorTag": "#FFD600",
      "notes": "Plan and organize tomorrow's full schedule, set goals and priorities",
      "tags": [
        "focus"
      ],
      "status": "planned",
      "createdAt": "2026-03-15T05:16:07.000Z",
      "updatedAt": "2026-03-15T05:16:07.000Z",
      "manualEntry": false
    },
    {
      "id": "f6a7b8c9-d0e1-4234-a567-b8c9d0e1f2a3",
      "subjectId": "6e8c81e4-3a21-4b96-b2c9-ad36a27f35f6",
      "startTime": "2026-03-15T13:30:00.000Z",
      "endTime": "2026-03-15T14:30:00.000Z",
      "plannedMinutes": 60,
      "actualSeconds": 0,
      "colorTag": "#4CAF50",
      "notes": "Revise all handwritten notes and key concepts covered throughout the day",
      "tags": [
        "focus"
      ],
      "status": "planned",
      "createdAt": "2026-03-15T05:16:06.000Z",
      "updatedAt": "2026-03-15T05:16:06.000Z",
      "manualEntry": false
    },
    {
      "id": "e5f6a7b8-c9d0-4123-f456-a7b8c9d0e1f2",
      "subjectId": "c76b81e7-3b96-415c-ac19-3a578e54ab3d",
      "startTime": "2026-03-15T11:30:00.000Z",
      "endTime": "2026-03-15T13:30:00.000Z",
      "plannedMinutes": 120,
      "actualSeconds": 0,
      "colorTag": "#9C27B0",
      "notes": "First hour: Read AI/ML theory and concepts | Second hour: Hands-on coding and implementation practice",
      "tags": [
        "focus"
      ],
      "status": "planned",
      "createdAt": "2026-03-15T05:16:05.000Z",
      "updatedAt": "2026-03-15T05:16:05.000Z",
      "manualEntry": false
    },
    {
      "id": "d4e5f6a7-b8c9-4012-e345-f6a7b8c9d0e1",
      "subjectId": "c231de4e-f8f9-4357-a2d8-5c1b6a25b5a8",
      "startTime": "2026-03-15T10:30:00.000Z",
      "endTime": "2026-03-15T11:30:00.000Z",
      "plannedMinutes": 60,
      "actualSeconds": 0,
      "colorTag": "#00BCD4",
      "notes": "Read English book for vocabulary and comprehension, attend or review class material",
      "tags": [
        "focus"
      ],
      "status": "planned",
      "createdAt": "2026-03-15T05:16:04.000Z",
      "updatedAt": "2026-03-15T05:16:04.000Z",
      "manualEntry": false
    },
    {
      "id": "c3d4e5f6-a7b8-4901-d234-e5f6a7b8c9d0",
      "subjectId": "271078f7-ad20-4f28-8312-6569b486d2dc",
      "startTime": "2026-03-15T09:30:00.000Z",
      "endTime": "2026-03-15T10:30:00.000Z",
      "plannedMinutes": 60,
      "actualSeconds": 2089,
      "colorTag": "#F44336",
      "notes": "Complete pending assignments, solve practice questions and prepare for upcoming exams",
      "tags": [
        "focus"
      ],
      "status": "paused",
      "createdAt": "2026-03-15T05:16:03.000Z",
      "updatedAt": "2026-03-15T11:52:00.265Z",
      "manualEntry": false
    },
    {
      "id": "b2c3d4e5-f6a7-4890-c123-d4e5f6a7b8c9",
      "subjectId": "c5d5a5aa-09ba-4217-b472-4dbd44006563",
      "startTime": "2026-03-15T08:30:00.000Z",
      "endTime": "2026-03-15T09:30:00.000Z",
      "plannedMinutes": 60,
      "actualSeconds": 3671,
      "colorTag": "#FF9800",
      "notes": "Lunch break — eat food, take rest and recharge for the second half of the day",
      "tags": [
        "focus"
      ],
      "status": "completed",
      "createdAt": "2026-03-15T05:16:02.000Z",
      "updatedAt": "2026-03-15T09:31:57.681Z",
      "manualEntry": false
    },
    {
      "id": "a1b2c3d4-e5f6-4789-b012-c3d4e5f6a7b8",
      "subjectId": "e55dc1fd-51f9-4fe8-ad04-8efd3e400e0a",
      "startTime": "2026-03-15T06:30:00.000Z",
      "endTime": "2026-03-15T08:30:00.000Z",
      "plannedMinutes": 120,
      "actualSeconds": 5795,
      "colorTag": "#FF5722",
      "notes": "Write detailed handwritten notes for code concepts, syntax, logic and important patterns from Sigma 9.0",
      "tags": [
        "focus"
      ],
      "status": "completed",
      "createdAt": "2026-03-15T05:16:01.000Z",
      "updatedAt": "2026-03-15T08:30:42.388Z",
      "manualEntry": false
    },
    {
      "id": "f3a1b2c3-d4e5-4f67-a890-b1c2d3e4f5a6",
      "subjectId": "17ad7fb6-ad6b-4bce-91ac-a6ce32c109dc",
      "startTime": "2026-03-15T04:30:00.000Z",
      "endTime": "2026-03-15T06:29:00.000Z",
      "plannedMinutes": 119,
      "actualSeconds": 3104,
      "colorTag": "#2196F3",
      "notes": "Watch Sigma 9.0 course lectures, practice DSA problems and work on web development projects",
      "tags": [
        "focus"
      ],
      "status": "completed",
      "createdAt": "2026-03-15T05:16:00.000Z",
      "updatedAt": "2026-03-15T06:54:06.864Z",
      "manualEntry": false
    }
  ];
}
