# backend/app/utils/color_utils.py
import math


def kelvin_to_rgb(kelvin: int):
    # port of the TS function above (same algorithm)
    K = max(1000, min(40000, kelvin)) / 100.0
    # compute red green blue float
    if K <= 66:
        red = 255
    else:
        red = K - 60
        red = 329.698727446 * (red ** -0.1332047592)
        red = max(0, min(255, red))
    if K <= 66:
        green = 99.4708025861 * math.log(K) - 161.1195681661
        green = max(0, min(255, green))
    else:
        green = K - 60
        green = 288.1221695283 * (green ** -0.0755148492)
        green = max(0, min(255, green))
    if K >= 66:
        blue = 255
    elif K <= 19:
        blue = 0
    else:
        blue = K - 10
        blue = 138.5177312231 * math.log(blue) - 305.0447927307
        blue = max(0, min(255, blue))
    return (int(red), int(green), int(blue))

