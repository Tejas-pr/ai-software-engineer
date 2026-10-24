1. [x] need to add test cases.
2. [x] dockerize the app (up should up all service BE FE DB redis all)
3. [x] caddy.
4. Need a chat bot where I can tell things that it can do (if I say 'check my demmy repo and fix the issues from it" it should go and check it and fix)
5. [x] need refresh and session tokens, since after somedays it is expiring the github issue section not rendering since the token is expired -> added 401 interception and one-click GitHub re-auth prompts across issue picker and repo connectors.
6. [x] Need proper error handling and message need to show to the user.
7. [x] delete the project option (available both in projects list and inside project detail header with confirmation dialog).
8. [x] need to add the rate limiter it is there? (verified: Redis-backed global 300 req/min rate limiter + agent token-bucket limiter), list all the security in the application.
9. need to add capach using cloudefare.
