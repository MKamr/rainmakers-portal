@echo off
echo 🚀 GHL Webhook Local Testing
echo =========================
echo.

echo 📝 Make sure your backend is running on http://localhost:5000
echo.

echo 1️⃣ Testing webhook endpoint...
curl -X GET http://localhost:5000/api/deals/webhook/test
echo.
echo.

echo 2️⃣ Getting test information...
curl -X GET http://localhost:5000/api/deals/webhook/test-info
echo.
echo.

echo 📋 Next steps:
echo 1. Copy a deal ID from the test info above
echo 2. Get pipeline and stage IDs from GHL
echo 3. Test stage change with:
echo    curl -X POST http://localhost:5000/api/deals/webhook/test-stage-change ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"dealId\":\"YOUR_DEAL_ID\",\"newStageId\":\"YOUR_STAGE_ID\",\"pipelineId\":\"YOUR_PIPELINE_ID\"}"
echo.
echo 4. Set up GHL webhook with URL: http://localhost:5000/api/deals/webhook/ghl-opportunity-update
echo.

pause
