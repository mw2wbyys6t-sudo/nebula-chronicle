#!/usr/bin/env python3
"""Submit video generation tasks via Modellix REST API and poll for results."""
import json
import os
import sys
import time
import urllib.request
import urllib.error

API_KEY = "mdlx-hVCG1tqofQFaCDys6NnleNuxbTeQN1282OQIaW5K4Nekb6Qk"
BASE_URL = "https://api.modellix.ai"
MODEL = "bytedance/seedance-2.0-i2v"
RAW_PREFIX = "https://raw.githubusercontent.com/mw2wbyys6t-sudo/wonderful-screen/trae/solo-agent-ePa5us/images/generated/video-refs"
OUT_DIR = "/workspace/images/generated"

VIDEOS = [
    {
        "name": "nebula-trailer-v3-a",
        "first_frame": f"{RAW_PREFIX}/composite-a.jpg",
        "prompt": (
            "Cinematic anime scene. Eight iconic anime heroines arranged in a glowing ring "
            "slowly rotate around the central 'NEBULA CHRONICLE' title. Soft nebula clouds drift "
            "in the deep purple-cyan space background. Each character portrait is enclosed in a "
            "colored luminous ring matching her theme color. Subtle sparkles, floating particles, "
            "and gentle lens flares. Slow continuous rotation, loop-friendly, no camera shake, "
            "premium website background quality."
        )
    },
    {
        "name": "nebula-trailer-v3-b",
        "first_frame": f"{RAW_PREFIX}/composite-b.jpg",
        "prompt": (
            "Cinematic anime group portrait montage. Eight classic anime heroines gently breathe "
            "and shimmer in a layered group composition against a deep space nebula. Soft petals, "
            "feathers, and stardust drift across the frame. Subtle parallax and slow zoom out. "
            "Emotional, dreamlike atmosphere like an anime ending sequence. Loop-friendly, "
            "slow and smooth camera movement, premium background quality."
        )
    },
    {
        "name": "nebula-trailer-v3-c",
        "first_frame": f"{RAW_PREFIX}/composite-c.jpg",
        "prompt": (
            "Mystical anime ritual scene. Eight glowing glass cards containing character silhouettes "
            "slowly rotate in a circle. The cards refract aurora light and emit soft colored glows. "
            "Stardust flows between the cards like constellation lines. Deep purple and teal aurora "
            "background. Slow graceful rotation, glass reflections shimmer, loop-friendly, "
            "no text or watermarks, premium website background quality."
        )
    }
]


def api_request(path, data=None, method="GET"):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
        payload = json.dumps(data).encode("utf-8")
        req.data = payload
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def submit_video(name, first_frame, prompt):
    provider, model_id = MODEL.split("/", 1)
    path = f"/api/v1/{provider}/{model_id}/async"
    body = {
        "first_frame_image": first_frame,
        "prompt": prompt,
        "duration": 6,
        "ratio": "16:9",
        "resolution": "720p",
        "camera_fixed": False,
        "generate_audio": False,
    }
    resp = api_request(path, body, "POST")
    if resp.get("code") != 0:
        raise RuntimeError(f"Submit failed for {name}: {resp}")
    return resp["data"]["task_id"]


def poll_task(task_id, timeout=1200):
    url = f"/api/v1/tasks/{task_id}"
    start = time.time()
    while time.time() - start < timeout:
        resp = api_request(url)
        if resp.get("code") != 0:
            raise RuntimeError(f"Poll failed: {resp}")
        status = resp["data"].get("status")
        print(f"  [{task_id}] status: {status}")
        if status == "success":
            resources = resp["data"]["result"]["resources"]
            return resources[0]["url"]
        if status in ("failed", "error"):
            raise RuntimeError(f"Task failed: {resp}")
        time.sleep(5)
    raise RuntimeError("Polling timeout")


def download_video(url, output_path):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(data)
    print(f"  saved {output_path} ({len(data)} bytes)")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    state_file = "/workspace/.video-tasks.json"

    # Load existing state
    state = {}
    if os.path.exists(state_file):
        with open(state_file) as f:
            state = json.load(f)

    # Submit pending tasks
    for v in VIDEOS:
        name = v["name"]
        if name in state and state[name].get("url"):
            print(f"Skip {name} (already downloaded)")
            continue
        if name not in state:
            print(f"Submitting {name}...")
            task_id = submit_video(name, v["first_frame"], v["prompt"])
            print(f"  task_id: {task_id}")
            state[name] = {"task_id": task_id, "url": None}
            with open(state_file, "w") as f:
                json.dump(state, f, indent=2)

    # Poll all pending
    pending = {k: v for k, v in state.items() if not v.get("url")}
    if not pending:
        print("All videos already ready.")
        return

    print(f"Polling {len(pending)} tasks...")
    for name, info in pending.items():
        try:
            url = poll_task(info["task_id"])
            state[name]["url"] = url
            with open(state_file, "w") as f:
                json.dump(state, f, indent=2)
            output_path = os.path.join(OUT_DIR, f"{name}.mp4")
            download_video(url, output_path)
        except Exception as e:
            print(f"ERROR processing {name}: {e}")


if __name__ == "__main__":
    main()
