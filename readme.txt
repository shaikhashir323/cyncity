Base URL:
https://cyncity-production-75a3.up.railway.app

User Endpoints

1. Register a New User

Endpoint:POST https://cyncity-production-75a3.up.railway.app/auth/register

Headers:{
  "Content-Type": "application/json"
}
Request Body eg:
{
  "email": "user@example.com",
  "password": "securepassword"
}
Response {
  "id": 1,
  "email": "user@example.com",
  "password": "$2b$10$hashedpassword"
}

2. Login a User

Endpoint:POST /auth/login
Headers:{
  "Content-Type": "application/json"
}
Request Body eg:{
  "email": "user@example.com",
  "password": "securepassword"
}
Response 
{
  "message": "Login successful",
  "id": 1,
  "email": "user@example.com"
}

3. Get All users

Endpoint: GET /auth/users
Headers:{
  "Content-Type": "application/json"
} 
Response { [
    {
        "id": 3,
        "email": "shaikhashir71@gmail.com",
        "password": "$2b$10$IC/ht5stGiGYUfuurCmeK.FvNh2aWrfW2rKcJhoP1.8k/lfKjB7l2"
    },
    {
        "id": 4,
        "email": "ashirshaikh2014@gmail.com",
        "password": "$2b$10$QgcqrXJ1dlZnKC3IZ8s4V.hdrNnjmIjJS2BnPl4d0gBnQsKwJ4YpS"
    },
    {
        "id": 5,
        "email": "ashirshaikh20@gmail.com",
        "password": "$2b$10$8fv8l.a9VZ4tNjOwa0KjbODBRDbQaGshbbCvT4KyZMO2upfxfN4dS"
    }
]
}

Watches Endpoint 

1:Registers a new watch with a name, brand, username, and password.
Endpoint:POST /watches/register

Headers:{
  "Content-Type": "application/json"
}
Request Body eg:{ 
  "name": "Rolex",
  "brand": "Luxury",
  "username": "watchUser",
  "password": "securepassword",
  "userId": 1
}
Response:
{
  "id": 1,
  "name": "Rolex",
  "brand": "Luxury",
  "username": "watchUser",
  "password": "$2b$10$hashedpassword",
  "user": {
    "id": 1
  }
}

2: Login a Watch

Endpoint: POST /watches/login

Headers:{
  "Content-Type": "application/json"
}
Request Body eg:{
  "username": "watchUser",
  "password": "securepassword"
}
Response:{
 message: 'Login successful'}

Authenticates a watch by validating the username and password.

Returns a success message and watch details (including userId) if credentials are correct.

Returns an error message if credentials are incorrect.

5. Get All Watches
Endpoint: GET /watches

Headers:
{
  "Content-Type": "application/json"
}
Response:{
[
  {
    "id": 1,
    "name": "Rolex",
    "brand": "Luxury",
    "username": "watchUser",
    "userId": 1
  },
  {
    "id": 2,
    "name": "Omega",
    "brand": "Sports",
    "username": "omegaUser",
    "userId": 2
  }
]
}

[
  {
    "id": 1,
    "name": "Rolex",
    "brand": "Luxury",
    "username": "watchUser",
    "userId": 1
  },
  {
    "id": 2,
    "name": "Omega",
    "brand": "Sports",
    "username": "omegaUser",
    "userId": 2
  }
]

Apple Sign-In Api
URL: https://cyncity-production-75a3.up.railway.app/auth/apple
Method: POST
Content-Type: application/json
Request Body:
{
  "appleUserId": "string", // The unique identifier for the Apple user (token)
  "email": "string"        // The email address of the user
}
Response:
{
  "message": "User logged in successfully with Apple.",
  "user": {
    "id": 8,
    "email": "developers@qfnetwork.org",
    "isVerified": true,
    "accessToken": "000038.0e051e8b214e45cab5c5022f8ab79f10.1023"
  }
}
If the user is registered successfully, the response will be:
{
  "message": "User registered successfully with Apple.",
  "user": {
    "id": 9,
    "email": "newuser@example.com",
    "isVerified": true,
    "accessToken": "000038.0e051e8b214e45cab5c5022f8ab79f10.1023"
  }
}

Error Response:
{
  "message": "User does not exist"
}





Retrieves a list of all registered watches, including their associated userId.