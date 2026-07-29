#!/usr/bin/env python3
"""批量生成剩余角色海报：伊蕾娜、御坂美琴"""
import json
import os
import time
import urllib.request
import urllib.error

API_KEY = "mdlx-hVCG1tqofQFaCDys6NnleNuxbTeQN1282OQIaW5K4Nekb6Qk"
BASE_URL = "https://api.modellix.ai/api/v1/openai/gpt-image-2"
TASK_URL = "https://api.modellix.ai/api/v1/tasks"
OUTPUT_DIR = "/workspace/images/login"

CHARACTERS = [
    {
        "name": "elaina",
        "prompt": (
            "Create a cinematic vertical anime movie poster for Elaina (Majo no Tabitabi / Wandering Witch). "
            "She is a beautiful young witch with long flowing silver-white hair, large bright azure-blue eyes, "
            "and a gentle confident smile. She wears her iconic black witch hat with a white ribbon, "
            "a white collared shirt, a dark navy/blue witch cloak with gold/yellow star accents, "
            "and a dark skirt. She holds a wooden staff with a glowing magical orb. "
            "Background: a dreamy fantasy sky at sunset with floating ancient books, magical sparkles, "
            "distant castle towers and fluffy clouds. "
            "The image uses a vertical magazine cover layout with empty areas at top and bottom for Japanese title text. "
            "Soft cinematic lighting, vibrant colors, ultra-detailed anime illustration style, "
            "4K quality, best composition."
        )
    },
    {
        "name": "misaka-mikoto",
        "prompt": (
            "Create a cinematic vertical anime movie poster for Misaka Mikoto (Toaru Kagaku no Railgun / A Certain Scientific Railgun). "
            "She is an attractive middle-school girl with short chestnut-brown hair styled in a bob, "
            "famous small bangs between her eyes, and sharp confident brown eyes. "
            "She wears the Tokiwadai Middle School uniform: a white short-sleeve blouse with beige sweater vest, "
            "a gray pleated skirt, and brown loafers. "
            "She is unleashing her electromagnetic esper powers: bright blue-white electricity crackling around her, "
            "sparks and lightning bolts, coins flipping between her fingers (railgun signature pose). "
            "Background: a dramatic Academy City skyline at dusk with neon lights, wind effects, and electric particles. "
            "The image uses a vertical magazine cover layout with empty areas at top and bottom for Japanese title text. "
            "Dynamic cinematic lighting, high contrast, ultra-detailed anime illustration style, "
            "4K quality, best composition."
        )
    }
]


def api_request(url, data=None, method="GET"):
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
        payload = json.dumps(data).encode("utf-8")
        req.data = payload
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def submit_task(prompt):
    data = {
        "prompt": prompt,
        "size": "1024x1536",
        "quality": "high"
    }
    resp = api_request(BASE_URL, data, "POST")
    if resp.get("code") != 0:
        raise RuntimeError(f"Submit failed: {resp}")
    return resp["data"]["task_id"]


def poll_task(task_id):
    url = f"{TASK_URL}/{task_id}"
    for i in range(300):  # 10 minutes max
        resp = api_request(url)
        if resp.get("code") != 0:
            raise RuntimeError(f"Poll failed: {resp}")
        status = resp["data"].get("status")
        print(f"  poll {i}: {status}")
        if status == "success":
            resources = resp["data"]["result"]["resources"]
            return resources[0]["url"]
        if status in ("failed", "error"):
            raise RuntimeError(f"Task failed: {resp}")
        time.sleep(2)
    raise RuntimeError("Polling timeout")


def download_image(url, output_path):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(data)
    print(f"  saved {output_path} ({len(data)} bytes)")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for char in CHARACTERS:
        output_path = os.path.join(OUTPUT_DIR, f"{char['name']}.jpg")
        if os.path.exists(output_path) and os.path.getsize(output_path) > 100000:
            print(f"Skip {char['name']} (already exists)")
            continue
        print(f"Generating {char['name']}...")
        try:
            task_id = submit_task(char["prompt"])
            print(f"  task_id: {task_id}")
            image_url = poll_task(task_id)
            download_image(image_url, output_path)
            time.sleep(3)
        except Exception as e:
            print(f"  ERROR generating {char['name']}: {e}")


if __name__ == "__main__":
    main()
