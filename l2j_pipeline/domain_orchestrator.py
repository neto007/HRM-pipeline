"""
Domain Orchestrator
Classifies Java files into functional domains (Core, Network, Gameplay) using heuristics and package analysis.
"""
import os
import json
from enum import Enum
from typing import Dict, List

class Domain(str, Enum):
    CORE = "Core"
    NETWORK = "Network"
    GAMEPLAY = "Gameplay"
    DATA = "Data/Persistence"
    AI = "ArtificialIntelligence"
    SCRIPTS = "Scripts"
    UNKNOWN = "Unknown"

class DomainOrchestrator:
    def __init__(self):
        self.rules = {
            Domain.CORE: ["com.l2jserver.Config", "com.l2jserver.L2DatabaseFactory", "com.l2jserver.ThreadPoolManager"],
            Domain.NETWORK: ["com.l2jserver.mmocore", "com.l2jserver.network", "Packet"],
            Domain.GAMEPLAY: ["com.l2jserver.gameserver.model", "com.l2jserver.gameserver.skills", "com.l2jserver.gameserver.handler"],
            Domain.DATA: ["com.l2jserver.gameserver.datatables", "com.l2jserver.gameserver.instancemanager"],
            Domain.AI: ["com.l2jserver.gameserver.ai"],
            Domain.SCRIPTS: ["com.l2jserver.gameserver.script"]
        }

    def classify_file(self, file_path: str, package: str = "") -> Domain:
        """Classifies a file based on its package or path."""
        # Check explicit rules
        for domain, patterns in self.rules.items():
            for pattern in patterns:
                if pattern in package or pattern in file_path:
                    return domain
        
        # Heuristics based on path keywords
        path_lower = file_path.lower()
        if "packet" in path_lower: return Domain.NETWORK
        if "model" in path_lower: return Domain.GAMEPLAY
        if "ai" in path_lower: return Domain.AI
        if "data" in path_lower or "xml" in path_lower: return Domain.DATA
        
        return Domain.UNKNOWN

    def generate_domain_map(self, file_list: List[str]) -> Dict[str, List[str]]:
        """Generates a mapping of Domain -> List[Files]."""
        domain_map = {d.value: [] for d in Domain}
        
        for fpath in file_list:
            # Basic package extraction could be done here or passed in
            domain = self.classify_file(fpath)
            domain_map[domain.value].append(fpath)
            
        return domain_map

if __name__ == "__main__":
    # Test
    orch = DomainOrchestrator()
    print(orch.classify_file("src/main/java/com/l2jserver/gameserver/network/clientpackets/RequestLogin.java"))
