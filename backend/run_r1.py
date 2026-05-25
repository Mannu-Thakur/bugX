import requests
import json
import time

BASE = "http://localhost:8000/api/v1"

def pretty(r):
    print(f"STATUS: {r.status_code}")
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)
    print("-" * 60)

print("=== [R1-TC01] Health ===")
r = requests.get(f"{BASE}/health")
pretty(r)

print("=== [R1-TC03] Register — Valid new user ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "testuser1@example.com",
    "username": "testuser1",
    "password": "Password1"
})
pretty(r)

print("=== [R1-TC04] Register — Valid second user ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "testuser2@example.com",
    "username": "testuser2",
    "password": "Secure123"
})
pretty(r)

print("=== [R1-TC05] Register — Duplicate email ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "testuser1@example.com",
    "username": "different_user",
    "password": "Password1"
})
pretty(r)

print("=== [R1-TC06] Register — Duplicate username ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "totally_new@example.com",
    "username": "testuser1",
    "password": "Password1"
})
pretty(r)

print("=== [R1-TC07] Register — Password with no digit ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "bad@example.com",
    "username": "baduser",
    "password": "NoDigitsHere"
})
pretty(r)

print("=== [R1-TC08] Register — Password with no letter ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "bad2@example.com",
    "username": "baduser2",
    "password": "12345678"
})
pretty(r)

print("=== [R1-TC09] Register — Password too short (< 8 chars) ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "bad3@example.com",
    "username": "baduser3",
    "password": "Ab1"
})
pretty(r)

print("=== [R1-TC10] Register — Username too short (< 3 chars) ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "bad4@example.com",
    "username": "ab",
    "password": "Password1"
})
pretty(r)

print("=== [R1-TC11] Register — Username with invalid characters ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "bad5@example.com",
    "username": "bad user!",
    "password": "Password1"
})
pretty(r)

print("=== [R1-TC12] Register — Invalid email format ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "not-an-email",
    "username": "validuser99",
    "password": "Password1"
})
pretty(r)

print("=== [R1-TC13] Register — Missing required fields ===")
r = requests.post(f"{BASE}/auth/register", json={
    "email": "incomplete@example.com"
})
pretty(r)

print("=== [R1-TC14] Register — Empty body ===")
r = requests.post(f"{BASE}/auth/register", json={})
pretty(r)
