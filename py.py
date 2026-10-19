from pwn import xor

ciphertext = bytes.fromhex("0e0b213f26041e480b26217f27342e175d0e070a3c5b103e2526217f27342e175d0e077e263451150104")

partial_key = xor(ciphertext[:9], b"crypto{")
print(f"{partial_key}") 

key = b"myXORkey"
flag = xor(ciphertext, key).decode()
print(f"{flag}")