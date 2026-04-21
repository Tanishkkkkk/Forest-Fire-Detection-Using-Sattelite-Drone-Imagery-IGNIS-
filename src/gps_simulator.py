import time
import random

lat = -8.005   # Amazon hotspot center
lon = -60.005

def get_gps():
    global lat, lon
    lat += random.uniform(-0.00005, 0.00005)
    lon += random.uniform(-0.00005, 0.00005)
    return round(lat, 6), round(lon, 6)

if __name__ == "__main__":
    while True:
        print(get_gps())
        time.sleep(1)
